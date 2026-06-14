/* Generic type-to-confirm delete dialog (mirrors DeletePipelineModal). */
import { useEffect, useState } from 'react';
import { Input, Modal, Typography } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

export interface DeleteResourceModalProps {
  open: boolean;
  /** Human-readable kind, e.g. `PipelineRun`. */
  resourceKind: string;
  name: string;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteResourceModal({
  open,
  resourceKind,
  name,
  confirming,
  onCancel,
  onConfirm,
}: DeleteResourceModalProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) {
      setText('');
    }
  }, [open]);

  return (
    <Modal
      open={open}
      title={
        <span>
          <ExclamationCircleFilled
            style={{ color: '#ff4d4f', marginRight: 8 }}
          />
          Delete {resourceKind}
        </span>
      }
      okText="Delete"
      okButtonProps={{
        danger: true,
        disabled: text !== name,
        loading: confirming,
      }}
      cancelText="Cancel"
      onOk={onConfirm}
      onCancel={onCancel}
    >
      <Typography.Paragraph>
        Are you sure you want to delete {resourceKind.toLowerCase()} '{name}'?
      </Typography.Paragraph>
      <Typography.Paragraph>
        Type <Typography.Text type="danger">{name}</Typography.Text> to confirm
      </Typography.Paragraph>
      <Input
        value={text}
        onChange={e => setText(e.target.value)}
        onPressEnter={() => text === name && onConfirm()}
      />
    </Modal>
  );
}
