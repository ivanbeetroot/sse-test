/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import { AppService } from './app.service';
import {
  concatMap,
  connectable,
  from,
  fromEvent,
  multicast,
  Observable,
  Observer,
  startWith,
  Subject,
} from 'rxjs';
import PQueue from 'p-queue';
import { Request } from 'express';
import * as crypto from 'crypto';

const queue = new PQueue({ concurrency: 1 });

queue.on('completed', (result) => {
  console.log('completed', result);
});

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  private _subjects = new Map<string, Subject<any> | null>();

  @Get()
  async getHello(): Promise<string> {
    return this.appService.getHello();
  }

  @Sse('sse')
  sse(): Observable<any> {
    return new Observable((subscriber) => {
      queue
        .add(async () => {
          try {
            subscriber.next({ data: 'Hello World!' });
            await new Promise((resolve) => setTimeout(resolve, 5000));
            throw new BadRequestException('Bad Request');
            // subscriber.next({ data: 'Hello World!1' });
            // subscriber.complete();
          } catch (e: any) {
            subscriber.error({
              message: e.message,
              status: 'error',
              code: e.getStatus(),
            });
          }
        })
        .then();
      subscriber.next({ data: 'Task added to queue' });
    });
  }

  @Sse('sse2')
  sse2(@Req() req: Request): Observable<any> {
    const id = crypto.randomUUID();
    const subject = new Subject();
    this._subjects.set(id, subject);

    const onClose = fromEvent(req, 'close');
    const subscription = onClose.subscribe({
      next: () => {
        subject.complete();
        this._subjects.delete(id);
        subscription.unsubscribe();
      },
    });

    return subject.pipe(startWith({ data: { id, status: 'task-start' } }));
  }

  @Post('test')
  async test(@Query('id', ParseUUIDPipe) id: string): Promise<string> {
    const subject = this._subjects.get(id);
    subject?.next({ data: 'Task is processing' });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    subject?.next({ data: 'Task is done' });
    subject?.complete();
    return 'Task Done';
  }
}
