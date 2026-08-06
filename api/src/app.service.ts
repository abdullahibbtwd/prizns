import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'prizn-api',
      status: 'ok',
    };
  }
}
