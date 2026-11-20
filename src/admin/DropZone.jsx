import { useEffect, useRef, useState } from 'react'

export default function DropZone({ label, accept, multiple, onFiles, previewUrls }) {
    const [dragOver, setDragOver] = useState(false)
    const inputRef = useRef(null)

    const handleFiles = (fileList) => {
        const files = Array.from(fileList)
        onFiles(multiple ? files : files[0] ?? null)
    }

    return (
        <div
            className={`dropzone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                handleFiles(e.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
        >
            <p>{label}</p>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={(e) => handleFiles(e.target.files)}
                onClick={(e) => e.stopPropagation()}
            />
            {previewUrls?.length > 0 && (
                <div className="dropzone-previews">
                    {previewUrls.map((url) => (
                        <img key={url} src={url} alt="" className="admin-preview" />
                    ))}
                </div>
            )}
        </div>
    )
}