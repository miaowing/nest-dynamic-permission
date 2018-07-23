import { Module, DynamicModule, Global } from '@nestjs/common';
import { DynamicPermission } from './dynamic.permisson';
import { Boot } from 'nest-boot';

@Global()
@Module({})
export class PermissionModule {
  static init(controllers: any, service?: string): DynamicModule {
    const permissionProvider = {
      provide: 'DynamicPermission',
      useFactory: (): DynamicPermission => {
        return new DynamicPermission(controllers, service);
      },
    };

    return {
      module: PermissionModule,
      components: [permissionProvider],
      exports: [permissionProvider],
    };
  }

  static initWithBoot(controllers: any, path: string): DynamicModule {
    const permissionProvider = {
      provide: 'DynamicPermission',
      useFactory: (boot: Boot): DynamicPermission => {
        return new DynamicPermission(controllers, boot.get(path));
      },
      inject: ['BootstrapProvider'],
    };

    return {
      module: PermissionModule,
      components: [permissionProvider],
      exports: [permissionProvider],
    };
  }
}
