import React from "react";
import Modal from "@/components/common/Modal";
import { Field } from "@/models/types";

interface FieldDeleteConfirmModalProps {
    deleteTarget: Field | null;
    onConfirm: () => void;
    onCancel: () => void;
}

const FieldDeleteConfirmModal: React.FC<FieldDeleteConfirmModalProps> = ({
    deleteTarget,
    onConfirm,
    onCancel,
}) => {
    return (
        <Modal
            open={!!deleteTarget}
            title="필드 삭제"
            subtitle={
                deleteTarget
                    ? `정말로 '${deleteTarget.name}' 필드를 삭제하시겠습니까? 되돌릴 수 없습니다.`
                    : ""
            }
            onDismiss={onCancel}
            onCancel={onCancel}
            onSave={onConfirm}
            saveText="Delete"
            cancelText="Cancel"
            saveDisabled={!deleteTarget}
        >
            <p className="text-sm text-red-600">
                이 동작은 관련된 모든 Property 데이터에서 해당 필드 값을
                제거합니다.
            </p>
        </Modal>
    );
};

export default FieldDeleteConfirmModal;
