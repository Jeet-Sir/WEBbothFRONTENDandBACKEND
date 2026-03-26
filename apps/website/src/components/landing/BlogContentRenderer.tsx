'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface BlogContentRendererProps {
    content: string;
}

interface ContentElement {
    type: 'paragraph' | 'h2' | 'h3' | 'emoji-heading' | 'list-start' | 'list-item' | 'list-end' | 'table' | 'hr';
    content?: string;
    rows?: string[][];
}

const BlogContentRenderer: React.FC<BlogContentRendererProps> = ({ content }) => {
    if (!content) return null;

    // Split content into paragraphs and process
    const processContent = (text: string): ContentElement[] => {
        const lines = text.split('\n');
        const elements: ContentElement[] = [];
        let currentParagraph: string[] = [];
        let inList = false;
        let inTable = false;
        let tableRows: string[][] = [];

        lines.forEach((line) => {
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) {
                if (currentParagraph.length > 0) {
                    elements.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                    currentParagraph = [];
                }
                if (inTable && tableRows.length > 0) {
                    elements.push({ type: 'table', rows: tableRows });
                    tableRows = [];
                }
                inList = false;
                inTable = false;
                return;
            }

            // Horizontal rule
            if (trimmedLine === '---') {
                if (currentParagraph.length > 0) {
                    elements.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                    currentParagraph = [];
                }
                elements.push({ type: 'hr' });
                inList = false;
                return;
            }

            // Check for headings
            const h2Match = trimmedLine.match(/^##\s+(.*)/);
            if (h2Match) {
                if (currentParagraph.length > 0) {
                    elements.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                    currentParagraph = [];
                }
                elements.push({ type: 'h2', content: h2Match[1] || '' });
                return;
            }

            const h3Match = trimmedLine.match(/^###\s+(.*)/);
            if (h3Match) {
                if (currentParagraph.length > 0) {
                    elements.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                    currentParagraph = [];
                }
                elements.push({ type: 'h3', content: h3Match[1] || '' });
                return;
            }

            // Check for box-drawing character table
            if (trimmedLine.includes('│') || trimmedLine.includes('┌') || trimmedLine.includes('├') || trimmedLine.includes('└')) {
                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }
                // Extract table data (skip border lines)
                if (trimmedLine.includes('│') && !trimmedLine.startsWith('┌') && !trimmedLine.startsWith('├') && !trimmedLine.startsWith('└')) {
                    const cells = trimmedLine.split('│').map(cell => cell.trim()).filter(cell => cell);
                    if (cells.length > 0) {
                        tableRows.push(cells);
                    }
                }
                return;
            }

            // Check for markdown pipe table (| col | col | ...)
            if (trimmedLine.startsWith('|')) {
                // Skip separator rows like | :--- | :--- | --- |
                const stripped = trimmedLine.replace(/\|/g, '').trim();
                const isSeparator = stripped.length === 0 || /^[\s:|-]+$/.test(stripped);
                if (isSeparator) {
                    return; // skip this line entirely
                }
                if (!inTable) {
                    if (currentParagraph.length > 0) {
                        elements.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                        currentParagraph = [];
                    }
                    inTable = true;
                    tableRows = [];
                }
                const cells = trimmedLine.split('|')
                    .map(cell => cell.trim());
                
                // Remove the empty cells at the start and end of the array caused by the leading and trailing pipes
                if (cells[0] === '') cells.shift();
                if (cells[cells.length - 1] === '') cells.pop();

                if (cells.length > 0) {
                    tableRows.push(cells);
                }
                return;
            } else if (inTable) {
                // End of table
                if (tableRows.length > 0) {
                    elements.push({ type: 'table', rows: tableRows });
                    tableRows = [];
                }
                inTable = false;
            }

            // Check for list items (bulleted or numbered)
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || /^\d+\.\s+/.test(trimmedLine)) {
                if (currentParagraph.length > 0) {
                    elements.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                    currentParagraph = [];
                }
                if (!inList) {
                    elements.push({ type: 'list-start' });
                    inList = true;
                }
                const contentWithoutMarker = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')
                    ? trimmedLine.substring(2)
                    : trimmedLine.replace(/^\d+\.\s+/, '');
                elements.push({ type: 'list-item', content: contentWithoutMarker });
                return;
            } else if (inList) {
                elements.push({ type: 'list-end' });
                inList = false;
            }

            // Check for emoji headings (💰, 🚀, etc.)
            const emojiRegex = /^[💰🚀🔐🏁✅❌📊🟢⚙️🛡️🌍🎓💼🧾]/;
            if (emojiRegex.test(trimmedLine) && trimmedLine.length < 100) {
                if (currentParagraph.length > 0) {
                    elements.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                    currentParagraph = [];
                }
                elements.push({ type: 'emoji-heading', content: trimmedLine });
                return;
            }

            // Regular paragraph text
            currentParagraph.push(trimmedLine);
        });

        // Add remaining paragraph
        if (currentParagraph.length > 0) {
            elements.push({ type: 'paragraph', content: currentParagraph.join(' ') });
        }

        // Close any open list
        if (inList) {
            elements.push({ type: 'list-end' });
        }

        // Add remaining table
        if (tableRows.length > 0) {
            elements.push({ type: 'table', rows: tableRows });
        }

        return elements;
    };

    const elements = processContent(content);
    let listItems: string[] = [];
    let listKey = 0;

    const renderInline = (text: string) => {
        // First split on links [label](url)
        // Important: inner URL group is non-capturing so split doesn't emit a separate raw "https://..." segment.
        const linkRegex = /(\[[^\]]+\]\((?:https?:\/\/[^\s)]+)\))/g;
        const segments = text.split(linkRegex);

        return segments.map((segment, idx) => {
            const match = segment.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
            if (match) {
                const label = match[1];
                const href = match[2];
                return (
                    <a
                        key={`link-${idx}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-semibold underline decoration-blue-300 hover:text-blue-800"
                    >
                        {label}
                    </a>
                );
            }

            // Handle bold inside non-link text
            const boldParts = segment.split(/(\*\*.*?\*\*)/g);
            return boldParts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={`b-${idx}-${pIdx}`} className="font-bold text-gray-900">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                return <span key={`t-${idx}-${pIdx}`}>{part}</span>;
            });
        });
    };

    return (
        <div className="blog-content space-y-6 text-gray-800">
            {elements.map((element, index) => {
                switch (element.type) {
                    case 'h2':
                        return (
                            <h2 key={index} className="text-3xl font-bold text-gray-900 mt-10 mb-6 pb-3 border-b-2 border-blue-200 relative">
                                <span className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600 rounded"></span>
                                {element.content}
                            </h2>
                        );
                    case 'h3':
                        return (
                            <h3 key={index} className="text-2xl font-bold text-gray-800 mt-8 mb-4 flex items-center gap-3">
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                {element.content}
                            </h3>
                        );
                    case 'emoji-heading':
                        const emojiMatch = element.content?.match(/^[💰🚀🔐🏁✅❌📊🟢⚙️🛡️🌍🎓💼🧾]/);
                        const emoji = emojiMatch ? emojiMatch[0] : '';
                        const text = element.content?.replace(/^[💰🚀🔐🏁✅❌📊🟢⚙️🛡️🌍🎓💼🧾]\s*/, '') || '';

                        const bgColors: Record<string, string> = {
                            '💰': 'from-yellow-400 to-orange-500',
                            '🚀': 'from-purple-400 to-pink-500',
                            '🔐': 'from-green-400 to-emerald-500',
                            '🏁': 'from-blue-400 to-cyan-500',
                            '✅': 'from-green-500 to-teal-500',
                            '❌': 'from-red-400 to-rose-500',
                            '📊': 'from-indigo-400 to-purple-500',
                            '🟢': 'from-emerald-400 to-green-600',
                            '⚙️': 'from-gray-400 to-gray-600',
                            '🛡️': 'from-blue-400 to-indigo-600',
                            '🌍': 'from-cyan-400 to-blue-500',
                            '🎓': 'from-blue-500 to-indigo-600',
                            '💼': 'from-amber-400 to-orange-500',
                            '🧾': 'from-teal-400 to-emerald-600'
                        };

                        return (
                            <div key={index} className={`mt-10 mb-6 p-6 rounded-2xl bg-gradient-to-r ${bgColors[emoji] || 'from-blue-500 to-blue-600'} text-white shadow-lg`}>
                                <h2 className="text-3xl font-bold flex items-center gap-3">
                                    <span className="text-5xl">{emoji}</span>
                                    <span>{text}</span>
                                </h2>
                            </div>
                        );
                    case 'paragraph':
                        // Check if it's an introductory paragraph (first paragraph after heading)
                        const isIntro = index > 0 && elements[index - 1]?.type === 'h2';

                        return (
                            <p key={index} className={`${isIntro ? 'text-xl text-gray-800 leading-relaxed font-medium mb-6' : 'text-lg text-gray-700 leading-relaxed'} first:mt-0`}>
                                {element.content ? renderInline(element.content) : null}
                            </p>
                        );
                    case 'list-start':
                        listItems = [];
                        return null;
                    case 'list-item':
                        if (element.content) {
                            listItems.push(element.content);
                        }
                        return null;
                    case 'list-end':
                        const items = [...listItems];
                        listItems = [];
                        return (
                            <ul key={`list-${listKey++}`} className="space-y-4 my-8 list-none bg-gray-50 p-6 rounded-xl border-l-4 border-blue-500">
                                {items.map((item, itemIdx) => (
                                    <motion.li
                                        key={itemIdx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: itemIdx * 0.1 }}
                                        className="flex items-start gap-4 text-lg text-gray-700 leading-relaxed group"
                                    >
                                        <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5 group-hover:scale-110 transition-transform shadow-md">
                                            ✓
                                        </span>
                                        <span className="flex-1 group-hover:text-gray-900 transition-colors">
                                            {renderInline(item)}
                                        </span>
                                    </motion.li>
                                ))}
                            </ul>
                        );
                    case 'hr':
                        return <hr key={index} className="my-10 border-t border-gray-200" />;
                    case 'table':
                        if (!element.rows || element.rows.length === 0) return null;
                        const headers = element.rows[0];
                        const dataRows = element.rows.slice(1);
                        return (
                            <div key={index} className="my-10 overflow-x-auto rounded-xl shadow-xl border border-gray-200">
                                <table className="min-w-full bg-white">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800">
                                            {headers.map((header, idx) => (
                                                <th key={idx} className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {dataRows.map((row, rowIdx) => (
                                            <tr
                                                key={rowIdx}
                                                className={`transition-colors duration-200 ${rowIdx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'
                                                    }`}>
                                                {row.map((cell, cellIdx) => {
                                                    const isFirstCol = cellIdx === 0;
                                                    const isLastCol = cellIdx === row.length - 1;
                                                    return (
                                                        <td key={cellIdx} className={`px-6 py-4 text-sm ${isFirstCol ? 'font-semibold text-gray-900' : 'text-gray-700'
                                                            } ${isLastCol && cell.includes('₹') ? 'text-green-600 font-bold text-base' : ''}`}>{cell}</td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
};

export default BlogContentRenderer;