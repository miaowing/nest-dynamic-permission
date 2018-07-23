import { Module, DynamicModule, Global } from '@nestjs/common';
import { DynamicPermisson } from './dynamic.permisson';

@Global()
@Module({})
export class PermissionModule {
  static forRoot(controllers: any, service?: string): DynamicModule {
    const permissionProvider = {
      provide: 'DynamicPermission',
      useFactory: (): DynamicPermisson => {
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
