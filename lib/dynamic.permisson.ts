import 'reflect-metadata';
import { Route } from './route';
import { keyBy } from 'lodash';
import { Permission } from './permission';
import * as UrlPattern from 'url-pattern';
import * as LRU from 'lru-cache';

export class DynamicPermission {
  private readonly controllers;
  private readonly patternCache = new LRU({ max: 50, maxAge: 1000 * 60 * 30 });
  private readonly permissionCache = new LRU({
    max: 50,
    maxAge: 1000 * 60 * 30,
  });
  private readonly DEFAULT_SERVICE = 'default-service';
  private readonly service: string = 'default-service';
  private routes: Route[] = [];
  private permission: any = {};
  private readonly REQUEST_METHOD = {
    0: 'GET',
    1: 'POST',
    2: 'PUT',
    3: 'DELETE',
    4: 'PATCH',
    5: 'ALL',
    6: 'OPTIONS',
    7: 'HEAD',
  };

  constructor(controllers: any, service: string) {
    this.controllers = controllers;
    this.service = service;
  }

  valid(role: string, method: string, url: string) {
    if (this.permissionCache.has(`${role}-${method}-${url}`)) {
      return this.permissionCache.get(`${role}-${method}-${url}`);
    }

    const permissions = this.permission[role];
    if (!permissions) {
      this.permissionCache.put(`${role}-${method}-${url}`, true);
      return true;
    }

    for (let i = 0; i < permissions.length; i++) {
      const permission = permissions[i];
      if (permission.method === method) {
        if (!this.patternCache.has(`${permission.method}-${permission.url}`)) {
          this.patternCache.put(
            `${permission.method}-${permission.url}`,
            new UrlPattern(permission.url),
          );
        }

        const pattern = this.patternCache.get(
          `${permission.method}-${permission.url}`,
        );
        if (pattern.match(url)) {
          this.permissionCache.put(
            `${role}-${method}-${url}`,
            permission.strategy !== 'forbidden',
          );
          return permission.strategy !== 'forbidden';
        }
      }
    }

    this.permissionCache.put(`${role}-${method}-${url}`, true);
    return true;
  }

  importPermissions(permissions: Permission[]) {
    this.permission = {};
    const routeMap = keyBy(
      this.routes,
      obj => `${obj.service || this.DEFAULT_SERVICE}-${obj.key}`,
    );
    permissions.forEach(permission => {
      if (!this.permission[permission.role]) {
        this.permission[permission.role] = [];
      }

      if (
        routeMap[
          `${permission.service || this.DEFAULT_SERVICE}-${permission.key}`
        ]
      ) {
        this.permission[permission.role].push({
          ...permission,
          ...routeMap[`${permission.service}-${permission.key}`],
        });
      }
    });
  }

  importRoutes(routes: Route[]) {
    this.routes = routes;
  }

  collect(callback?: (routes) => void, interval: number = 5000) {
    this.routes = [];
    for (const key in this.controllers) {
      if (!this.controllers.hasOwnProperty(key)) continue;
      const controller = this.controllers[key];
      const prefix = this.handleURI(
        Reflect.getMetadata('path', controller) || '/',
      );
      const methods = Object.getOwnPropertyNames(controller.prototype).filter(
        method => method !== 'constructor',
      );
      methods.forEach(key => {
        const func = controller.prototype[key];
        const method = Reflect.getMetadata('method', func);
        const swagger = Reflect.getMetadata('swagger/apiOperation', func);
        const uri = this.handleURI(Reflect.getMetadata('path', func));
        this.routes.push({
          method: this.REQUEST_METHOD[method],
          url: prefix + uri,
          key,
          description: swagger ? swagger.summary : '',
          service: this.service,
        });
      });
    }
    if (callback) {
      const report = async () => {
        try {
          if (callback instanceof Promise) {
            await callback(this.routes);
          } else {
            callback(this.routes);
          }
        } catch (e) {
          setTimeout(() => report(), interval);
        }
      };
      report();
    }
  }

  private handleURI(uri: string) {
    if (uri && uri.charAt(0) !== '/') {
      uri = '/' + uri;
    }

    return uri;
  }
}
