/* Type-to-confirm delete dialog (mirrors acp's DeleteNamespaceModal). */
import { useEffect, useState } from 'react';
import { Input, Modal, Typography } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

export interface DeletePipelineModalProps {
  open: boolean;
  name: string;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeletePipelineModal({
  open,
  name,
  confirming,
  onCancel,
  onConfirm,
}: DeletePipelineModalProps) {
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
          <ExclamationCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />
          Delete Pipeline
        </span>
      }
      okText="Delete"
      okButtonProps={{ danger: true, disabled: text !== name, loading: confirming }}
      cancelText="Cancel"
      onOk={onConfirm}
      onCancel={onCancel}
    >
      <Typography.Paragraph>
        Are you sure you want to delete pipeline '{name}'?
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
