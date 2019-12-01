import path from 'path';
import { DSLController, httpMethods } from '@nxapi/nxapi';

export default interface IRoute {
  path?: string;
  httpMethod?: string;
  className?: string;
  classMethodName?: string;
  inputFieldNames?: string[];
}

export const extractRoutes = (controllerDsls: DSLController[]) => {
  const routes: IRoute[] = [];
  controllerDsls.forEach(ctrl => {
    ctrl.classMethods.forEach(method => {
      httpMethods.forEach(hm => {
        if (!method[hm]) return;
        const route: IRoute = {};
        route.path = path.join(
          '/',
          ctrl.path.substring(1, ctrl.path.length - 1),
          method[hm].substring(1, method[hm].length - 1)
        );
        if (method.req.type === 'params') {
          route.inputFieldNames = [];
          method.req.fields.forEach(field => {
            route.inputFieldNames.push(field.name);
          });
        }
        route.httpMethod = hm;
        route.className = ctrl.className;
        route.classMethodName = method.classMethodName;
        routes.push(route);
      });
    });
  });
  return routes;
};
