import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn utility', () => {
    it('merges class names correctly', () => {
        expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('handles conditional classes', () => {
        expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2')
    })

    it('handles arrays and objects', () => {
        expect(cn('class1', ['class2', 'class3'], { class4: true, class5: false })).toBe('class1 class2 class3 class4')
    })

    it('handles tailwind conflicts', () => {
        // twMerge should properly handle this
        expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
        expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
    })
})
