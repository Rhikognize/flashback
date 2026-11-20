import { useEffect, useState } from 'react'

export function useFilePreviews(files) {
    const [urls, setUrls] = useState([])

    useEffect(() => {
        const list = Array.isArray(files) ? files : files ? [files] : []
        const created = list.map((f) => URL.createObjectURL(f))
        setUrls(created)
        return () => created.forEach((u) => URL.revokeObjectURL(u))
    }, [files])

    return urls
}