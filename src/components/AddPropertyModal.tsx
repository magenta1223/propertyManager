import React, { useEffect, useMemo, useRef, useState } from "react";
import { Field, FieldType, Property, PropertyField } from "@/models/types";
import Modal from "@/components/common/Modal";
import dynamic from "next/dynamic";

interface AddPropertyModalProps {
    open: boolean;
    fields: Field[];
    onClose: () => void;
    onCreated: (property: Property) => void; // push to list optimistically
    addToast: (t: {
        message: string;
        variant?: "success" | "error" | "info";
        duration?: number;
    }) => void;
}

interface FieldErrorState {
    [fieldId: number]: string | null;
}

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
    open,
    fields,
    onClose,
    onCreated,
    addToast,
}) => {
    const sorted = useMemo(
        () =>
            [...fields].sort(
                (a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.id - b.id
            ),
        [fields]
    );
    const [values, setValues] = useState<Record<number, any>>({});
    const [labels, setLabels] = useState<Record<number, string>>({}); // human readable labels (e.g. address for location)
    const [errors, setErrors] = useState<FieldErrorState>({});
    const [submitting, setSubmitting] = useState(false);
    const firstErrorRef = useRef<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
    >(null);
    const [locationTarget, setLocationTarget] = useState<Field | null>(null);
    const LocationPicker = useMemo(
        () =>
            dynamic(() => import("@/components/common/LocationPicker"), {
                ssr: false,
            }),
        []
    );

    useEffect(() => {
        if (open) {
            // init defaults
            const initValues: Record<number, any> = {};
            const initLabels: Record<number, string> = {};
            sorted.forEach((f) => {
                if (f.defaultValue) initValues[f.id] = f.defaultValue;
                else if (f.type === FieldType.BOOLEAN) initValues[f.id] = false;
                else initValues[f.id] = "";
                // initialize label (for location; for others may mirror value later)
                initLabels[f.id] = "";
            });
            setValues(initValues);
            setLabels(initLabels);
            setErrors({});
        }
    }, [open, sorted]);

    const validate = (): boolean => {
        const newErrors: FieldErrorState = {};
        let first: number | null = null;
        for (const f of sorted) {
            const v = values[f.id];
            const lbl = labels[f.id];
            if (f.isRequired) {
                const empty =
                    v === undefined ||
                    v === null ||
                    v === "" ||
                    (f.type === FieldType.LOCATION &&
                        (!v ||
                            typeof v !== "string" ||
                            v.split(",").length !== 2 ||
                            v === ","));
                if (empty) {
                    newErrors[f.id] = "필수 필드입니다. 입력해주세요";
                    if (first === null) first = f.id;
                    continue;
                }
                if (f.type === FieldType.LOCATION && (!lbl || !lbl.trim())) {
                    newErrors[f.id] = "주소(레이블)를 입력해주세요";
                    if (first === null) first = f.id;
                    continue;
                }
            }
            if (v !== undefined && v !== null && v !== "") {
                if (f.type === FieldType.NUMBER) {
                    if (isNaN(Number(v)))
                        newErrors[f.id] = "숫자를 입력해주세요";
                } else if (f.type === FieldType.URL) {
                    try {
                        new URL(String(v));
                    } catch {
                        newErrors[f.id] = "유효한 URL이 아닙니다";
                    }
                } else if (f.type === FieldType.DATE) {
                    if (isNaN(Date.parse(String(v))))
                        newErrors[f.id] = "유효한 날짜가 아닙니다";
                } else if (f.type === FieldType.LOCATION) {
                    const parts = String(v).split(",");
                    if (
                        parts.length !== 2 ||
                        parts.some((p) => p.trim() === "")
                    )
                        newErrors[f.id] = "좌표 선택이 필요합니다";
                }
            }
            if (newErrors[f.id] && first === null) first = f.id;
        }
        setErrors(newErrors);
        if (first !== null) {
            setTimeout(() => {
                const elem = document.querySelector(
                    `[data-field-id="${first}"]`
                ) as any;
                if (elem && typeof elem.focus === "function") elem.focus();
            }, 0);
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            // build Property object
            const property: Property = {
                id: 0,
                fields: sorted.map(
                    (f) =>
                        ({
                            ...f,
                            value: values[f.id],
                            label:
                                f.type === FieldType.LOCATION
                                    ? labels[f.id] || values[f.id]
                                    : values[f.id],
                        } as PropertyField)
                ),
            };
            const res = await fetch("/api/properties", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(property),
            });
            if (!res.ok) {
                addToast({
                    message: `생성 실패: ${res.status}`,
                    variant: "error",
                    duration: 4000,
                });
                return;
            }
            const created = await res.json();
            onCreated(created);
            addToast({
                message: "매물이 추가되었습니다.",
                variant: "success",
                duration: 2500,
            });
            onClose();
        } catch (e: any) {
            addToast({
                message: `에러: ${e.message}`,
                variant: "error",
                duration: 4000,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const setValue = (field: Field, raw: any) => {
        let val: any = raw;
        if (field.type === FieldType.NUMBER) {
            // store as number if valid
            if (raw === "") val = "";
            else if (!isNaN(Number(raw))) val = raw; // keep as string, server not strict
        }
        if (field.type === FieldType.BOOLEAN) {
            val = !!raw;
        }
        setValues((prev) => ({ ...prev, [field.id]: val }));
        if (errors[field.id]) {
            setErrors((prev) => ({ ...prev, [field.id]: null }));
        }
    };

    const openLocation = (f: Field) => {
        setLocationTarget(f);
    };

    const applyLocation = (coords: { x: number; y: number }) => {
        if (locationTarget) {
            const value = `${coords.x},${coords.y}`;
            setValues((prev) => ({ ...prev, [locationTarget.id]: value }));
            setErrors((prev) => ({ ...prev, [locationTarget.id]: null }));
        }
    };

    return (
        <>
            <Modal
                open={open}
                title="매물 추가"
                subtitle="필드 값을 입력하여 새 매물을 생성합니다."
                onDismiss={onClose}
                onCancel={onClose}
                onSave={handleSubmit}
                saveText={submitting ? "Saving..." : "생성"}
                saveDisabled={submitting}
                size="2xl"
            >
                <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">
                    {sorted.map((f) => {
                        const error = errors[f.id];
                        const commonCls = `w-full px-3 py-2 rounded-md text-sm border ${
                            error
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:ring-blue-500"
                        } focus:outline-none focus:ring-2`;
                        const value = values[f.id] ?? "";
                        return (
                            <div key={f.id}>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    {f.name}
                                    {f.isRequired && (
                                        <span className="text-red-500 ml-0.5">
                                            *
                                        </span>
                                    )}
                                </label>
                                {f.type === FieldType.BOOLEAN ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            data-field-id={f.id}
                                            type="checkbox"
                                            checked={!!value}
                                            onChange={(e) =>
                                                setValue(f, e.target.checked)
                                            }
                                            className="h-4 w-4 text-blue-600"
                                        />
                                        <span className="text-xs text-gray-500">
                                            예 / 아니오
                                        </span>
                                    </div>
                                ) : f.type === FieldType.LOCATION ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                data-field-id={f.id}
                                                readOnly
                                                value={value}
                                                placeholder="x,y"
                                                className={
                                                    commonCls +
                                                    " cursor-not-allowed bg-gray-50"
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={() => openLocation(f)}
                                                className="px-2 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                                좌표 선택
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={labels[f.id] || ""}
                                            onChange={(e) =>
                                                setLabels((prev) => ({
                                                    ...prev,
                                                    [f.id]: e.target.value,
                                                }))
                                            }
                                            placeholder="주소 / 장소명"
                                            className={commonCls}
                                        />
                                    </div>
                                ) : f.type === FieldType.DATE ? (
                                    <input
                                        data-field-id={f.id}
                                        type="date"
                                        value={value}
                                        onChange={(e) =>
                                            setValue(f, e.target.value)
                                        }
                                        className={commonCls}
                                    />
                                ) : f.type === FieldType.NUMBER ? (
                                    <input
                                        data-field-id={f.id}
                                        type="number"
                                        value={value}
                                        onChange={(e) =>
                                            setValue(f, e.target.value)
                                        }
                                        className={commonCls}
                                    />
                                ) : f.type === FieldType.URL ? (
                                    <input
                                        data-field-id={f.id}
                                        type="url"
                                        value={value}
                                        onChange={(e) =>
                                            setValue(f, e.target.value)
                                        }
                                        className={commonCls}
                                        placeholder="https://..."
                                    />
                                ) : f.type === FieldType.IMAGE ? (
                                    <input
                                        data-field-id={f.id}
                                        type="text"
                                        value={value}
                                        onChange={(e) =>
                                            setValue(f, e.target.value)
                                        }
                                        className={commonCls}
                                        placeholder="이미지 URL"
                                    />
                                ) : (
                                    <input
                                        data-field-id={f.id}
                                        type="text"
                                        value={value}
                                        onChange={(e) =>
                                            setValue(f, e.target.value)
                                        }
                                        className={commonCls}
                                    />
                                )}
                                {f.unit &&
                                    !error &&
                                    value !== "" &&
                                    f.type !== FieldType.BOOLEAN && (
                                        <p className="mt-1 text-[11px] text-gray-500">
                                            표시: {value} {f.unit}
                                        </p>
                                    )}
                                {error && (
                                    <p className="mt-1 text-[11px] text-red-600">
                                        {error}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                    {sorted.length === 0 && (
                        <p className="text-sm text-gray-500">
                            정의된 필드가 없습니다. 먼저 필드를 추가하세요.
                        </p>
                    )}
                </div>
            </Modal>
            {locationTarget && (
                <div
                    className="fixed inset-0 z-[1600] bg-black/40 flex items-center justify-center p-4"
                    onClick={() => setLocationTarget(null)}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-semibold mb-2 text-sm">
                            좌표 선택: {locationTarget.name}
                        </h3>
                        <LocationPicker
                            value={
                                values[locationTarget.id]
                                    ? {
                                          x:
                                              Number(
                                                  String(
                                                      values[locationTarget.id]
                                                  ).split(",")[0]
                                              ) || 0,
                                          y:
                                              Number(
                                                  String(
                                                      values[locationTarget.id]
                                                  ).split(",")[1]
                                              ) || 0,
                                      }
                                    : undefined
                            }
                            onSelect={(coords, lbl) => {
                                applyLocation(coords);
                                if (lbl) {
                                    setLabels((prev) => ({
                                        ...prev,
                                        [locationTarget.id]: lbl,
                                    }));
                                }
                            }}
                            height={360}
                        />
                        <div className="mt-3">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                주소 / 레이블
                            </label>
                            <input
                                type="text"
                                value={labels[locationTarget.id] || ""}
                                onChange={(e) =>
                                    setLabels((prev) => ({
                                        ...prev,
                                        [locationTarget.id]: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border rounded text-sm"
                                placeholder="예) 서울특별시 중구 ..."
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                className="px-4 py-2 text-sm rounded border"
                                onClick={() => setLocationTarget(null)}
                            >
                                닫기
                            </button>
                            <button
                                className="px-4 py-2 text-sm rounded bg-blue-600 text-white"
                                onClick={() => setLocationTarget(null)}
                            >
                                적용
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AddPropertyModal;
