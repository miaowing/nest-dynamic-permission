import { Module, DynamicModule, Global } from '@nestjs/common';
import { DynamicPermisson } from './dynamic.permisson';

@Global()
@Module({})
export class PermissionModule {
  static forRoot(): DynamicModule {
    const permissionProvider = {
      provide: 'DynamicPermission',
      useFactory: (controllers: any, service?: string): DynamicPermisson => {
        return new DynamicPermisson(controllers, service);
      },
      inject: ['DynamicPermission'],
    };

    return {
      module: PermissionModule,
      components: [permissionProvider],
      exports: [permissionProvider],
    };
  }
}
