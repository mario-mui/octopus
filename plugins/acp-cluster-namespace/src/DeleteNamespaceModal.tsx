/*
 * Type-to-confirm delete dialog (see namespace-delete design). The Delete button
 * stays disabled until the user types the namespace name exactly.
 */
import { useEffect, useState } from 'react';
import { Input, Modal, Typography } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

export interface DeleteNamespaceModalProps {
  open: boolean;
  name: string;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteNamespaceModal({
  open,
  name,
  confirming,
  onCancel,
  onConfirm,
}: DeleteNamespaceModalProps) {
  const [text, setText] = useState('');

  // Reset the confirmation field each time the dialog opens.
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
          Delete Namespace
        </span>
      }
      okText="Delete"
      okButtonProps={{ danger: true, disabled: text !== name, loading: confirming }}
      cancelText="Cancel"
      onOk={onConfirm}
      onCancel={onCancel}
    >
      <Typography.Paragraph>
        Are you sure you want to delete namespace '{name}'? After deletion, all
        resources in the namespace will be deleted.
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
