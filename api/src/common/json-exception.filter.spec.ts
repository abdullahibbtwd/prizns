import { describe, expect, it } from '@jest/globals';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { JsonExceptionFilter } from './json-exception.filter';

function mockHost(statusSpy: jest.Mock, jsonSpy: jest.Mock): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => ({
        status: statusSpy.mockReturnValue({ json: jsonSpy }),
      }),
    }),
  } as unknown as ArgumentsHost;
}

describe('JsonExceptionFilter', () => {
  it('returns clean JSON for 404', () => {
    const status = jest.fn();
    const json = jest.fn();
    const filter = new JsonExceptionFilter();
    filter.catch(
      new HttpException('Cannot GET /api/nope', HttpStatus.NOT_FOUND),
      mockHost(status, json),
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'Not found' });
  });

  it('maps other HttpExceptions to { error }', () => {
    const status = jest.fn();
    const json = jest.fn();
    const filter = new JsonExceptionFilter();
    filter.catch(
      new HttpException('Nope', HttpStatus.BAD_REQUEST),
      mockHost(status, json),
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Nope' });
  });
});
