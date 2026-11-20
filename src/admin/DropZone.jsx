
import { useRef, useState } from 'react'

export default function DropZone({ label, accept, multiple, onFiles, previewUrls }) {
    const [dragOver, setDragOver] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState([])
    const inputRef = useRef(null)

    const handleFiles = (fileList) => {
        const files = Array.from(fileList)

        if (!files.length) return

        setSelectedFiles(files)
        onFiles(multiple ? files : files[0] ?? null)
    }

    return (
        <div
            className={`dropzone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
            }}
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
                className="dropzone-input"
                onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="dropzone-file-picker">
                <button
                    type="button"
                    className="dropzone-browse"
                    onClick={(e) => {
                        e.stopPropagation()
                        inputRef.current?.click()
                    }}
                >
                    Browse...
                </button>

                <span className="dropzone-filename">
                    {selectedFiles.length > 0
                        ? selectedFiles.map(file => file.name).join(', ')
                        : multiple
                            ? 'No files chosen'
                            : 'No file chosen'}
                </span>
            </div>

            {previewUrls?.length > 0 && (
                <div className="dropzone-previews">
                    {previewUrls.map((url) => (
                        <img
                            key={url}
                            src={url}
                            alt=""
                            className="admin-preview"
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
