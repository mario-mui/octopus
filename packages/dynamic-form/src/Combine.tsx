/*
 * Combine widget — a parent field whose value is composed from several nested
 * child fields (ported from the pipeline `advanced-form` combine widget).
 *
 * Value mapping is bidirectional via `combine:value.exp`: each child derives its
 * value from the parent (`parent`, `items`, `context`), and the parent derives
 * its value from the children (`items`, `context`). Children render as nested
 * `DynamicField`s under a provider whose `context.items` exposes the live child
 * values, so child option/hidden expressions can reference them.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { DynamicFormProvider, useDynamicFormContext } from './context';
import { evalExpr } from './expression';
import { getCombineItems, getCombineValueExp } from './widgets';
import { Descriptor } from './types';
import { DynamicField } from './DynamicField';

export interface CombineFieldProps {
  descriptor: Descriptor;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function CombineField({ descriptor, value, onChange }: CombineFieldProps) {
  const ctx = useDynamicFormContext();
  const items = useMemo(() => getCombineItems(descriptor), [descriptor]);
  const parentValueExp = useMemo(() => getCombineValueExp(descriptor), [descriptor]);

  const [itemValues, setItemValues] = useState<Record<string, unknown>>({});
  const valueKey = JSON.stringify(value ?? null);

  // Derive each child's value from the parent (init / external sync).
  useEffect(() => {
    let acc: Record<string, unknown> = {};
    const next: Record<string, unknown> = {};
    for (const child of items) {
      const childExp = getCombineValueExp(child);
      const derived = childExp
        ? evalExpr(childExp, {
            parent: value,
            items: acc,
            context: { ...ctx.context, items: acc },
          })
        : value;
      next[child.path] = derived;
      acc = { ...acc, [child.path]: derived };
    }
    setItemValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey, items]);

  const childContext = useMemo(
    () => ({ ...ctx.context, items: itemValues }),
    [ctx.context, itemValues],
  );

  const lastEmitted = useRef<string>(valueKey);
  const updateItem = (path: string, v: unknown) => {
    const nextItems = { ...itemValues, [path]: v };
    setItemValues(nextItems);
    const parentValue = parentValueExp
      ? evalExpr(parentValueExp, {
          items: nextItems,
          context: { ...ctx.context, items: nextItems },
        })
      : nextItems;
    const key = JSON.stringify(parentValue ?? null);
    if (key !== lastEmitted.current) {
      lastEmitted.current = key;
      onChange(parentValue);
    }
  };

  return (
    <DynamicFormProvider
      context={childContext}
      fetchResource={ctx.fetchResource}
      locale={ctx.locale}
    >
      {items.map(child => (
        <DynamicField
          key={child.path}
          descriptor={child}
          value={itemValues[child.path]}
          onChange={v => updateItem(child.path, v)}
        />
      ))}
    </DynamicFormProvider>
  );
}
