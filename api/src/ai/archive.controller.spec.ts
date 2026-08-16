import { Test } from '@nestjs/testing'
import { ArchiveController } from './archive.controller'
import { AiService } from './ai.service'

describe('ArchiveController', () => {
  let controller: ArchiveController
  const ai = {
    assertRateLimit: jest.fn(),
    askArchive: jest.fn(),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ArchiveController],
      providers: [{ provide: AiService, useValue: ai }],
    }).compile()
    controller = module.get(ArchiveController)
  })

  it('rate limits and asks the archive', () => {
    const dto = { question: 'What is Kukeri?' }
    const req = { ip: '127.0.0.1', headers: {} } as never
    controller.ask(dto, req)
    expect(ai.assertRateLimit).toHaveBeenCalledWith(
      'archive-ask:127.0.0.1',
      8,
      60_000,
    )
    expect(ai.askArchive).toHaveBeenCalledWith(dto)
  })
})
