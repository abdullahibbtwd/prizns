import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  it('returns api info', () => {
    expect(service.getInfo()).toEqual({
      name: 'prizn-api',
      status: 'ok',
    });
  });
});
