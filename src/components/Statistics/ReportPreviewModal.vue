<template>
  <Teleport to="body">
    <div v-if="visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="header">
          <div>
            <h3>报表预览</h3>
            <p>{{ title || 'Markdown 报表内容' }}</p>
          </div>
          <button class="icon-btn" type="button" @click="close">
            <Icon icon="lucide:x" />
          </button>
        </div>

        <div class="body">
          <div v-if="loading" class="state">
            <Icon icon="lucide:loader-2" class="spin" />
            <span>正在加载报表预览...</span>
          </div>
          <div v-else-if="error" class="state err">
            <Icon icon="lucide:alert-circle" />
            <span>{{ error }}</span>
          </div>
          <article v-else class="markdown-body" v-html="renderedHtml"></article>
        </div>

        <div class="footer">
          <button class="secondary" type="button" @click="close">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, Teleport } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  visible: boolean
  loading: boolean
  error: string
  content: string
  title?: string
}>()

const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const close = () => emit('update:visible', false)

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const renderInlineMarkdown = (value: string) => {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

const renderMarkdown = (source: string) => {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let paragraph: string[] = []
  let listItems: string[] = []
  let listTag: 'ul' | 'ol' | null = null
  let inCodeBlock = false
  let codeBlockLanguage = ''
  let codeBlockLines: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push(`<p>${paragraph.map(renderInlineMarkdown).join('<br>')}</p>`)
    paragraph = []
  }

  const flushList = () => {
    if (!listTag || !listItems.length) return
    blocks.push(`<${listTag}>${listItems.join('')}</${listTag}>`)
    listItems = []
    listTag = null
  }

  const flushCodeBlock = () => {
    if (!codeBlockLines.length) return
    const languageClass = codeBlockLanguage ? ` class="language-${escapeHtml(codeBlockLanguage)}"` : ''
    blocks.push(`<pre><code${languageClass}>${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`)
    codeBlockLines = []
    codeBlockLanguage = ''
  }

  for (const line of lines) {
    const codeFenceMatch = line.match(/^```(\w+)?\s*$/)
    if (codeFenceMatch) {
      flushParagraph()
      flushList()
      if (inCodeBlock) flushCodeBlock()
      else codeBlockLanguage = codeFenceMatch[1] || ''
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    const trimmed = line.trim()
    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const hashes = headingMatch[1] || '#'
      const title = headingMatch[2] || trimmed
      const level = hashes.length
      blocks.push(`<h${level}>${renderInlineMarkdown(title)}</h${level}>`)
      continue
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (listTag && listTag !== 'ul') flushList()
      listTag = 'ul'
      listItems.push(`<li>${renderInlineMarkdown(unorderedMatch[1] || trimmed)}</li>`)
      continue
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listTag && listTag !== 'ol') flushList()
      listTag = 'ol'
      listItems.push(`<li>${renderInlineMarkdown(orderedMatch[1] || trimmed)}</li>`)
      continue
    }

    flushList()
    paragraph.push(trimmed)
  }

  if (inCodeBlock) flushCodeBlock()
  flushParagraph()
  flushList()

  return blocks.join('')
}

const renderedHtml = computed(() => renderMarkdown(props.content || ''))
</script>

<style scoped>
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;z-index:10000}
.modal{width:min(1100px,100%);height:min(88vh,900px);background:#fff;border:1px solid #dbe5f0;border-radius:18px;box-shadow:0 24px 60px rgba(15,23,42,.18);display:flex;flex-direction:column;overflow:hidden}
.header,.footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px}
.header{border-bottom:1px solid #e8ecf1}
.footer{border-top:1px solid #e8ecf1}
.header h3{margin:0;font-size:18px;color:#0f172a}
.header p{margin:6px 0 0;font-size:12px;color:#64748b}
.body{flex:1;overflow:auto;padding:24px;background:#fbfdff}
.state{display:flex;align-items:center;justify-content:center;gap:8px;height:100%;color:#64748b}
.state.err{color:#dc2626}
.icon-btn,.secondary{border:none;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.icon-btn{width:34px;height:34px;background:transparent;color:#64748b}
.secondary{min-height:40px;padding:0 16px;background:#eef2f7;color:#334155;font:700 13px inherit}
.markdown-body{max-width:920px;margin:0 auto;color:#334155;line-height:1.72}
.markdown-body :deep(p){margin:0}
.markdown-body :deep(p + p){margin-top:10px}
.markdown-body :deep(h1),.markdown-body :deep(h2),.markdown-body :deep(h3),.markdown-body :deep(h4),.markdown-body :deep(h5),.markdown-body :deep(h6){margin:0 0 10px;color:#0f172a;line-height:1.35}
.markdown-body :deep(h1){font-size:24px}.markdown-body :deep(h2){font-size:20px}.markdown-body :deep(h3){font-size:17px}
.markdown-body :deep(ul),.markdown-body :deep(ol){margin:8px 0 0;padding-left:18px}
.markdown-body :deep(li){margin:4px 0}
.markdown-body :deep(code){padding:2px 6px;border-radius:6px;background:rgba(16,90,167,.08);color:#0b4582;font-size:12px;font-family:'SFMono-Regular','Consolas','Liberation Mono',monospace}
.markdown-body :deep(pre){margin:10px 0 0;padding:14px;border-radius:12px;background:#0f1c2b;overflow:auto}
.markdown-body :deep(pre code){padding:0;background:transparent;color:#d9e8fb;font-size:12px;line-height:1.6}
.markdown-body :deep(a){color:#0b4582;text-decoration:underline}
.markdown-body :deep(strong){font-weight:800}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (max-width:640px){.overlay{padding:12px}.body{padding:16px}}
</style>
