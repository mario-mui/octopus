// @vitest-environment jsdom
/*
 * End-to-end validation of the combine + inlineForm widgets, rendered with a
 * descriptor like a Task's `style.tekton.dev/descriptors` would carry.
 */
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { stringify } from 'yaml';

import { DynamicField, DynamicFormProvider } from './index';
import type { Descriptor } from './index';

afterEach(cleanup);

/** A controlled harness exposing the field's current value as JSON. */
function Harness({
  descriptor,
  fetchResource,
}: {
  descriptor: Descriptor;
  fetchResource?: (url: string, opts?: unknown) => Promise<unknown>;
}) {
  const [value, setValue] = useState<unknown>(undefined);
  return (
    <DynamicFormProvider
      context={{ cluster: 'demo', namespace: 'ns1', project: 'p', params: {} }}
      fetchResource={fetchResource as never}
    >
      <DynamicField descriptor={descriptor} value={value} onChange={setValue} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </DynamicFormProvider>
  );
}

const textboxes = () =>
  screen.getAllByRole('textbox') as HTMLInputElement[];

describe('combine widget', () => {
  // params.fullName = first + last, with bidirectional value.exp mapping.
  const descriptor: Descriptor = {
    path: 'params.fullName',
    'x-descriptors': [
      'urn:alm:descriptor:widgets:combine',
      "urn:alm:descriptor:combine:value.exp:[items.first,items.last].filter(Boolean).join(' ')",
      {
        'urn:alm:descriptor:combine:items': [
          {
            path: 'first',
            'x-descriptors': [
              "urn:alm:descriptor:combine:value.exp:(parent||'').split(' ')[0]",
              'urn:alm:descriptor:label:en:First',
              'urn:alm:descriptor:com.tectonic.ui:text',
            ],
          },
          {
            path: 'last',
            'x-descriptors': [
              "urn:alm:descriptor:combine:value.exp:(parent||'').split(' ')[1]",
              'urn:alm:descriptor:label:en:Last',
              'urn:alm:descriptor:com.tectonic.ui:text',
            ],
          },
        ],
      },
    ] as never,
  };

  it('renders child fields and composes the parent value', async () => {
    render(<Harness descriptor={descriptor} />);

    // Two nested text inputs (First, Last).
    await waitFor(() => expect(textboxes()).toHaveLength(2));
    const [first, last] = textboxes();

    fireEvent.change(first, { target: { value: 'John' } });
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe('"John"'),
    );

    fireEvent.change(last, { target: { value: 'Doe' } });
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe('"John Doe"'),
    );
  });
});

describe('inlineForm widget', () => {
  // The external resource (a ConfigMap) carries its own descriptors annotation.
  const inlineDescriptors = stringify([
    {
      path: 'params.greeting',
      'x-descriptors': [
        'urn:alm:descriptor:label:en:Greeting',
        'urn:alm:descriptor:com.tectonic.ui:text',
      ],
    },
  ]);
  const configMap = {
    metadata: {
      name: 'tpl',
      annotations: { 'style.tekton.dev/descriptors': inlineDescriptors },
    },
  };

  const descriptor: Descriptor = {
    path: 'params.templateValues',
    'x-descriptors': [
      'urn:alm:descriptor:widgets:inlineForm',
      'urn:alm:descriptor:inlineForm:resource:api:/cfg',
      'urn:alm:descriptor:inlineForm:resource:path:items[0]',
      'urn:alm:descriptor:inlineForm:params:path.exp:parse($.metadata.annotations["style.tekton.dev/descriptors"]||"")?.map(d=>({name:d.path.split("params.")[1]}))',
      'urn:alm:descriptor:inlineForm:parse:Object.entries(parse($||"")||{}).reduce((a,c)=>{a.push({name:c[0],value:c[1]});return a},[])',
      'urn:alm:descriptor:inlineForm:stringify:$?.length ? stringify($.reduce((a,c)=>{a[c.name]=c.value;return a},{})) : ""',
    ],
  };

  it('fetches the resource, renders its params, and round-trips the value', async () => {
    const fetchResource = vi.fn().mockResolvedValue({ items: [configMap] });
    render(<Harness descriptor={descriptor} fetchResource={fetchResource} />);

    // Resource fetched with the interpolated api path.
    await waitFor(() => expect(fetchResource).toHaveBeenCalledWith('/cfg'));

    // The inline param renders as a text input.
    await waitFor(() => expect(textboxes()).toHaveLength(1));

    fireEvent.change(textboxes()[0], { target: { value: 'hi' } });

    // stringify turns the {name,value}[] into a yaml string for the field value.
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('value').textContent as string)).toContain(
        'greeting: hi',
      ),
    );
  });
});
