import { createTranslationRef } from '@octopus/core-plugin-api';

// Keys mirror the scoped translations the console's pipeline module used.
// Default messages are English; other languages can be lazy-loaded later.
export const devopsPipelineTranslationRef = createTranslationRef({
  id: 'devops-pipeline',
  messages: {
    pipelines: 'Pipelines',
    create_pipeline: 'Create Pipeline',
    delete_pipeline: 'Delete Pipeline',
    confirm_delete_pipeline:
      'Are you sure you want to delete pipeline "{{name}}"?',
    pipeline_delete_succeeded: 'Pipeline deleted successfully',
    pipeline_delete_failed: 'Failed to delete pipeline',
    detail_info: 'Details',
    orchestration: 'Orchestration',
    parameters: 'Parameters',
    workspaces: 'Workspaces',
    results: 'Results',
    finally: 'Finally',
    task: 'Task',
    add_task: 'Add Task',
  },
});
