import path from 'path';
import fs from 'fs';
import IRoute, { extractRoutes } from './route';
import { DSLController, hashCode } from '@nxapi/nxapi';

const getReqData = (httpMethod: string) => {
  if (httpMethod === 'get') {
    return 'ctx.request.query';
  } else if (httpMethod === 'post' || httpMethod === 'put' || httpMethod === 'delete') {
    return 'ctx.request.body';
  }
};

const firstLowerCase = (name: string) => {
  return name.replace(name[0], name[0].toLowerCase());
};

const convertToKoa = (controllerDsls: DSLController[], routes: IRoute[]) => {
  let imports = `import Service from './service';\n`;
  // let newClasss = '';
  controllerDsls.forEach(ctrl => {
    const relativePath = ctrl.fileFullPath.replace(path.join(process.cwd(), 'src'), '').replace('.ts', '');
    imports += `import ${ctrl.className} from '..${relativePath}';\n`;
    const insClassName = firstLowerCase(ctrl.className);
    // newClasss += `const ${insClassName} = new ${ctrl.className}();\n`;
  });
  imports += `const joiConf = require('./joi');\n`;
  let interfaces = '';
  routes.forEach(route => {
    const insClassName = firstLowerCase(route.className);
    const code = hashCode(route.httpMethod + route.path);
    interfaces += `
  router.${route.httpMethod}('${route.path}', async (ctx, next) => {
    const inputData = ${getReqData(route.httpMethod)}
    const joi = joiConf['${code}'];
    await validate(joi.request, inputData)
    const ${insClassName} = new ${route.className}();
    const service = new Service();
    service.setFields({ ctx: ctx });
    testController.ctx = ctx;
    testController.service = service;
    const outputData = await ${insClassName}.${route.classMethodName}(inputData);
    await validate(joi.response, outputData);
    ctx.body = outputData;
    await next();
  });
  `;
  });
  interfaces = `
module.exports = (router) => {
${interfaces}
}
`;
  const validateFun = `
const validate = (schame, data)=>{
  return schame.validate(data);
}`;
  const output = imports + validateFun + interfaces;
  return output;
};

const saveKoa = (content: string, savePath: string) => {
  const targetPath = path.resolve(process.cwd(), savePath);
  const exists = fs.existsSync(targetPath);
  if (!exists) {
    fs.mkdirSync(targetPath);
  }
  fs.writeFileSync(path.resolve(targetPath, 'routes.js'), content, 'utf8');
};
export default (controllerDsls: DSLController[], tmpRelativePath: string) => {
  const routes = extractRoutes(controllerDsls);
  const output = convertToKoa(controllerDsls, routes);
  saveKoa(output, tmpRelativePath);
  console.log('nxapi-dsl-koa success!');
};
