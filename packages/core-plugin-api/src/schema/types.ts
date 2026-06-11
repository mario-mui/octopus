import { JsonObject } from '@octopus/types';

/** @public */
export type PortableSchema<TOutput = unknown, TInput = TOutput> = {
  parse: (input: TInput) => TOutput;
  schema: () => { schema: JsonObject };
};
