/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Controller, Get, Sse } from '@nestjs/common';
import { AppService } from './app.service';
import { Observable } from 'rxjs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Sse('sse')
  sse(): Observable<any> {
    return new Observable((subscriber) => {
      Promise.resolve()
        .then(async () => {
          subscriber.next({ data: 'Hello World!' });
          await new Promise((resolve) => setTimeout(resolve, 5000));
          throw new BadRequestException('Error');
          // subscriber.next({ data: 'Hello World!1' });
          // subscriber.complete();
        })
        .catch((error) => {
          subscriber.next({
            data: {
              error: error.message,
              code: error.getStatus(),
            },
          });
          subscriber.error(error);
        });
    });
  }
}
