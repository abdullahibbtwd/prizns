import type { CanActivate, Type } from '@nestjs/common';
import type { TestingModuleBuilder } from '@nestjs/testing';

/** Override Nest guards so controller unit tests skip auth. */
export function overrideGuards(
  builder: TestingModuleBuilder,
  ...guards: Type<CanActivate>[]
): TestingModuleBuilder {
  for (const guard of guards) {
    builder.overrideGuard(guard).useValue({ canActivate: () => true });
  }
  return builder;
}
