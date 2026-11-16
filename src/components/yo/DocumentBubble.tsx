import React from 'react';
import { FileText, Download, FileSpreadsheet, FileArchive, FileCode, File, ExternalLink } from 'lucide-react';

interface DocumentBubbleProps {
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  isOwn: boolean;
}

export const DocumentBubble: React.FC<DocumentBubbleProps> = ({
  fileUrl,
  fileName = 'Document',
  fileSize,
  isOwn,
}) => {
  // Infer file extension
  const extension = (fileName.split('.').pop() || '').toLowerCase();

  const getFileIcon = () => {
    switch (extension) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-rose-400" />;
      case 'doc':
      case 'docx':
      case 'txt':
      case 'md':
        return <FileText className="w-6 h-6 text-blue-400" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="w-6 h-6 text-emerald-400" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <FileArchive className="w-6 h-6 text-amber-400" />;
      case 'js':
      case 'ts':
      case 'json':
      case 'html':
      case 'css':
        return <FileCode className="w-6 h-6 text-cyan-400" />;
      default:
        return <File className="w-6 h-6 text-primary" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'File';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div 
      onClick={handleDownload}
      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group my-1 max-w-[280px] select-none ${
        isOwn 
          ? 'bg-primary-foreground/10 hover:bg-primary-foreground/15 border-white/20' 
          : 'bg-white/5 hover:bg-white/10 border-white/10'
      }`}
    >
      {/* File Badge Icon */}
      <div className="w-11 h-11 rounded-xl bg-black/40 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10 shadow-sm group-hover:scale-105 transition-transform">
        {getFileIcon()}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs font-semibold text-white truncate group-hover:text-primary transition-colors">
          {fileName}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-white/60">
          <span className="uppercase font-mono tracking-wider font-semibold">
            {extension || 'FILE'}
          </span>
          <span>•</span>
          <span>{formatFileSize(fileSize)}</span>
        </div>
      </div>

      {/* Action Download / Open Icon */}
      <div className="w-8 h-8 rounded-full bg-black/30 group-hover:bg-primary/20 flex items-center justify-center text-white/80 group-hover:text-primary transition-colors shrink-0 border border-white/5">
        {fileUrl.startsWith('data:') ? (
          <Download className="w-4 h-4" />
        ) : (
          <ExternalLink className="w-4 h-4" />
        )}
      </div>
    </div>
  );
};
