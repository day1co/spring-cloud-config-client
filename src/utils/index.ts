import type { ObjectType } from '@day1co/pebbles';

export function createObjectByFlattenedKey({
  flattenedKey,
  value,
  separator = '.',
}: {
  flattenedKey: string;
  value: unknown;
  separator?: string;
}): ObjectType {
  const flattenedKeys = flattenedKey.split(separator);
  const lastKey = flattenedKeys.pop();

  let current: ObjectType = { [lastKey as string]: value };

  flattenedKeys.reverse().forEach((key) => {
    current = { [key]: current };
  });

  return current;
}

export function getValueFromNestedObject({
  flattenedKey,
  nestedObject,
  separator = '.',
}: {
  flattenedKey: string;
  nestedObject: ObjectType;
  separator?: string;
}): unknown {
  let current = nestedObject;
  const flattenedKeys = flattenedKey.split(separator);

  flattenedKeys.forEach((key) => {
    current = current[key];
  });

  return current;
}
