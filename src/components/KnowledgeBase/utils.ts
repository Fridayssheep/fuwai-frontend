export const formatDateTime = (value?: string | null) => {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date)
}

export const formatSourceType = (value?: string) => value ? value.toUpperCase() : '未知'

export const getFileIcon = (value?: string) => {
  const ext = value?.toLowerCase() || ''
  if (ext === 'pdf') return 'lucide:file-text'
  if (ext === 'md' || ext === 'markdown') return 'lucide:file-code-2'
  if (ext === 'docx' || ext === 'doc') return 'lucide:file-type-2'
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'lucide:file-spreadsheet'
  if (ext === 'txt') return 'lucide:file-text'
  if (ext === 'pptx' || ext === 'ppt') return 'lucide:presentation'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif') return 'lucide:image'
  return 'lucide:file'
}

export const getFileColorClass = (value?: string) => {
  const ext = value?.toLowerCase() || ''
  if (ext === 'pdf') return 'icon-pdf'
  if (ext === 'docx' || ext === 'doc') return 'icon-word'
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'icon-excel'
  if (ext === 'md' || ext === 'markdown') return 'icon-md'
  if (ext === 'pptx' || ext === 'ppt') return 'icon-ppt'
  if (ext === 'txt') return 'icon-txt'
  return 'icon-default'
}

export const getFileTagClass = (value?: string) => {
  const ext = value?.toLowerCase() || ''
  if (ext === 'pdf') return 'tag-pdf'
  if (ext === 'docx' || ext === 'doc') return 'tag-word'
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'tag-excel'
  if (ext === 'md' || ext === 'markdown') return 'tag-md'
  return 'tag-default'
}
