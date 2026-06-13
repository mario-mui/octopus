/*
 * The Parameters section of the task form (design/task-drawer): the task's
 * declared params, rendered descriptor-driven (DynamicParamsForm). The task may
 * pin which params show in the main area via `style.tekton.dev/displayParams`;
 * the remaining declared params drop into a collapsed "Additional Params" block.
 */
import { FoldableBlock } from '@octopus/console-core-components';
import { ParameterInputSet, Task } from '../../types';
import { getDisplayParams } from '../taskMeta';
import { DynamicParamsForm } from './DynamicParamsForm';

export interface ParametersSectionProps {
  taskResource: Task | null;
  cluster?: string;
  namespace?: string;
  value: ParameterInputSet[];
  onChange: (value: ParameterInputSet[]) => void;
}

export function ParametersSection({
  taskResource,
  cluster,
  namespace,
  value,
  onChange,
}: ParametersSectionProps) {
  const declaredNames = (taskResource?.spec?.params ?? []).map(p => p.name);

  // No declared params → DynamicParamsForm shows its "no parameters" hint.
  if (!declaredNames.length) {
    return (
      <DynamicParamsForm
        taskResource={taskResource}
        cluster={cluster}
        namespace={namespace}
        value={value}
        onChange={onChange}
      />
    );
  }

  // The task may pin which params show in the main area (style.tekton.dev/
  // displayParams); the rest of the declared params drop into Additional Params.
  const displayParams = getDisplayParams(taskResource);
  const mainNames = displayParams ?? declaredNames;
  const additionalDeclaredNames = displayParams
    ? declaredNames.filter(n => !displayParams.includes(n))
    : [];

  return (
    <>
      <DynamicParamsForm
        taskResource={taskResource}
        cluster={cluster}
        namespace={namespace}
        value={value}
        onChange={onChange}
        paramNames={mainNames}
      />
      {additionalDeclaredNames.length ? (
        <FoldableBlock label="Additional Params">
          <DynamicParamsForm
            taskResource={taskResource}
            cluster={cluster}
            namespace={namespace}
            value={value}
            onChange={onChange}
            paramNames={additionalDeclaredNames}
          />
        </FoldableBlock>
      ) : null}
    </>
  );
}
