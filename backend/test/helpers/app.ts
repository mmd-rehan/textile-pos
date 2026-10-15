import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/database/prisma.service';
import { TEST_ADMIN } from '../test-env';

export interface ApiResponse<T = any> {
  status: number;
  body: { success?: boolean; data?: T; meta?: any; error?: { code: string; message: string; details?: any } };
}

export class TestApi {
  constructor(
    readonly app: INestApplication,
    private token = '',
  ) {}

  withToken(token: string) {
    return new TestApi(this.app, token);
  }

  private send<T>(method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, body?: unknown, headers: Record<string, string> = {}) {
    let req = request(this.app.getHttpServer())[method](`/api/v1${path}`);
    if (this.token) req = req.set('Authorization', `Bearer ${this.token}`);
    for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
    if (body !== undefined) req = req.send(body as object);
    return req.then((res) => ({ status: res.status, body: res.body }) as ApiResponse<T>);
  }

  get<T = any>(path: string, headers?: Record<string, string>) {
    return this.send<T>('get', path, undefined, headers);
  }
  post<T = any>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.send<T>('post', path, body ?? {}, headers);
  }
  put<T = any>(path: string, body?: unknown) {
    return this.send<T>('put', path, body ?? {});
  }

  /** Asserts a 2xx response and returns its `data` payload. */
  async ok<T = any>(promise: Promise<ApiResponse<T>>): Promise<T> {
    const res = await promise;
    if (res.status >= 300) {
      throw new Error(`Expected success, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    return res.body.data as T;
  }

  async login(identifier: string, password: string) {
    const data = await this.ok<{ accessToken: string }>(this.post('/auth/login', { identifier, password }));
    return this.withToken(data.accessToken);
  }
}

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  /** Unauthenticated client. */
  anon: TestApi;
  /** Client logged in as the seeded admin (all permissions). */
  admin: TestApi;
}

export async function createTestContext(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();

  const anon = new TestApi(app);
  const admin = await anon.login(TEST_ADMIN.username, TEST_ADMIN.password);
  return { app, prisma: app.get(PrismaService), anon, admin };
}
