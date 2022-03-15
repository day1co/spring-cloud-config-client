import { createObjectByFlattenedKey, getNestedObjectValue } from '.';

describe('configClient utilities', () => {
  test('createObjectByFlattenedKey', () => {
    const flattenedKey = 'foo.bar.baz';
    const value = 'qux';
    const expected = { foo: { bar: { baz: value } } };

    expect(createObjectByFlattenedKey({ flattenedKey, value })).toEqual(expected);
  });

  test('getNestedObjectValue', () => {
    const nestedObject = { foo: { bar: { baz: 'qux' } } };

    const flattenedKey1 = 'foo.bar.baz';
    const flattenedKey2 = 'foo.bar';
    const expected1 = 'qux';
    const expected2 = { baz: 'qux' };

    expect(getNestedObjectValue({ flattenedKey: flattenedKey1, nestedObject })).toEqual(expected1);
    expect(getNestedObjectValue({ flattenedKey: flattenedKey2, nestedObject })).toEqual(expected2);
  });
});
