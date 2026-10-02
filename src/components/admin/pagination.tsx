'use client'

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const renderPageNumbers = () => {
    const items: Array<number | '...'> = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i)
      }
    } else {
      if (page <= 4) {
        items.push(1, 2, 3, 4, 5, '...', totalPages)
      } else if (page >= totalPages - 3) {
        items.push(
          1,
          '...',
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        )
      } else {
        items.push(1, '...', page - 1, page, page + 1, '...', totalPages)
      }
    }

    return items.map((item, index) => {
      if (item === '...') {
        return (
          <span
            key={`ellipsis-${index}`}
            className="flex h-8 w-8 items-center justify-center text-sm"
          >
            ...
          </span>
        )
      }

      return (
        <Button
          key={item}
          variant={page === item ? 'default' : 'outline'}
          aria-label={`第 ${item} 页`}
          aria-current={page === item ? 'page' : undefined}
          disabled={page === item}
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(item)}
        >
          {item}
        </Button>
      )
    })
  }

  return (
    <div className="flex items-center justify-between px-2">
      <div className="hidden flex-1 items-center gap-4 sm:flex">
        <p className="text-sm text-muted-foreground">
          第 {total === 0 ? 0 : start}–{end} 条，共 {total} 条
        </p>
        <div className="flex items-center space-x-2">
          <p id="page-size-label" className="text-sm font-medium">每页条数</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger aria-labelledby="page-size-label" className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top" className="motion-reduce:animate-none">
              {[10, 15, 20, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
          >
            <span className="sr-only">首页</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <span className="sr-only">上一页</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="hidden items-center gap-1 md:flex">
            {renderPageNumbers()}
          </div>

          <div className="flex w-[100px] items-center justify-center text-sm font-medium md:hidden">
            第 {page} / {totalPages} 页
          </div>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <span className="sr-only">下一页</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
          >
            <span className="sr-only">末页</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
