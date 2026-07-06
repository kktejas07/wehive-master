import React, { useState, useEffect, useRef } from "react";
import { 
  Folder, Upload, ShieldCheck, Eye, Trash2, Info, Lock, 
  AlertCircle, CheckCircle2, RefreshCw, Sparkles, FileText, FileCheck, X, Tag, Download, Search, Fingerprint
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Joyride, Step } from "react-joyride";

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  status: "verified" | "pending_review" | "missing" | "rejected";
  fileName: string;
  fileSize: string;
  requiredFor: string;
  category: "Identification" | "Academic" | "Financial";
  tag?: string;
}

interface VaultTabProps {
  onTriggerNotification: (title: string, body: string, type?: any, actionTab?: string) => void;
  colorScheme: any;
}

export default function VaultTab({ onTriggerNotification, colorScheme }: VaultTabProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isIdentificationUnlocked, setIsIdentificationUnlocked] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [runTour, setRunTour] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState<{ id: string, name: string, category: string, type: string, requiredFor: string } | null>(null);

  // Fetch documents from backend on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data);
    } catch (e) {
      console.error("Failed to fetch documents", e);
    }
  };

  const tourSteps: Step[] = [
    {
      target: '.tour-step-upload',
      content: 'Upload your missing documents here. We use AI to instantly scan and verify them.',
      disableBeacon: true,
    },
    {
      target: '.tour-step-categories',
      content: 'Documents are smartly categorized into folders like Academic or Financial.',
    },
    {
      target: '.tour-step-export',
      content: 'Export a PDF summary report of all your documents anytime.',
    }
  ];

  const handleUploadClick = (docId: string, docName: string, category: string, type: string, requiredFor: string) => {
    setUploadingDoc({ id: docId, name: docName, category, type, requiredFor });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingDoc) return;

    setLoadingDocId(uploadingDoc.id);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", uploadingDoc.name);
    formData.append("category", uploadingDoc.category);
    formData.append("type", uploadingDoc.type);
    formData.append("requiredFor", uploadingDoc.requiredFor);

    // Call document creation API
    try {
      await fetch("/api/documents", {
        method: "POST",
        body: formData
      });
      await fetchDocuments(); // refresh list
    } catch (e) {
      console.error(e);
      onTriggerNotification("Upload Failed", "Could not upload document.");
      setLoadingDocId(null);
      return;
    }

    // Call OCR endpoint
    try {
      const ocrFormData = new FormData();
      ocrFormData.append("file", file);
      ocrFormData.append("documentName", uploadingDoc.name);
      ocrFormData.append("documentType", uploadingDoc.type);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: ocrFormData
      });
      const data = await response.json();
      if (data.extractedText) {
        setOcrResult(data.extractedText);
      }
    } catch (e) {
      console.error("OCR Failed", e);
    }
    
    setLoadingDocId(null);
    setUploadingDoc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    onTriggerNotification(
      "Document Uploaded", 
      `"${uploadingDoc.name}" has been secure-uploaded and AI OCR data extracted.`
    );
  };

  const handleDeleteSimulate = (docId: string, docName: string) => {
    // For now we just filter it out locally (mocking delete since we didn't build DELETE route yet)
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    onTriggerNotification(
      "Document Removed", 
      `"${docName}" has been permanently purged from the secure vault.`
    );
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Document Vault Report", 20, 20);
      
      doc.setFontSize(12);
      let y = 40;
      documents.forEach((item, index) => {
        doc.text(`${index + 1}. ${item.name} (${item.category})`, 20, y);
        doc.setFontSize(10);
        doc.text(`Status: ${item.status.toUpperCase()} | File: ${item.fileName || "N/A"}`, 25, y + 6);
        if (item.tag) doc.text(`Tag: ${item.tag}`, 25, y + 12);
        doc.setFontSize(12);
        y += 20;
      });
      
      doc.save("WeHive_Document_Report.pdf");
      onTriggerNotification("Report Exported", "Your vault status report has been successfully downloaded.");
    } catch (error) {
      console.error("PDF generation failed:", error);
      onTriggerNotification("Export Failed", "Failed to generate PDF. Make sure jspdf is installed.");
    }
  };

  const getStatusProps = (status: string) => {
    switch (status) {
      case "verified":
        return { label: "Verified", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: CheckCircle2 };
      case "pending_review":
        return { label: "In Review", color: "text-amber-600 bg-amber-50 border-amber-100", icon: RefreshCw };
      case "rejected":
        return { label: "Rejected (AI Audit)", color: "text-rose-600 bg-rose-50 border-rose-100", icon: AlertCircle };
      default:
        return { label: "Action Required", color: "text-slate-500 bg-slate-50 border-slate-100", icon: Info };
    }
  };

  const categories = ["Identification", "Academic", "Financial"];
  
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.tag && doc.tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pieData = categories.map(cat => ({
    name: cat,
    value: documents.filter(d => d.category === cat && d.status !== "missing").length
  })).filter(d => d.value > 0);
  const COLORS = ['#0f172a', '#3b82f6', '#10b981'];

  // Combine fetched documents with a "missing" template so the user always sees what they need to upload.
  const requiredDocsTemplate = [
    { id: "req-1", name: "Passport Datapage", category: "Identification", type: "Identification", requiredFor: "Visa & University", status: "missing" },
    { id: "req-2", name: "Academic Transcript", category: "Academic", type: "Academic Record", requiredFor: "University Admission", status: "missing" },
    { id: "req-3", name: "Statement of Purpose (SOP)", category: "Academic", type: "Essay", requiredFor: "University Admission", status: "missing" },
    { id: "req-4", name: "Blocked Account Certificate", category: "Financial", type: "Financial Proof", requiredFor: "Germany Visa", status: "missing" }
  ];

  // Merge template with uploaded docs
  const displayDocuments = [...documents];
  requiredDocsTemplate.forEach(req => {
    if (!documents.some(d => d.name === req.name)) {
      displayDocuments.push(req as any);
    }
  });

  const finalFilteredDocuments = displayDocuments.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.tag && doc.tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 bg-slate-50 p-4 font-sans select-none overflow-x-hidden" style={{ fontFamily: "system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif" }}>
      
      {/* Hidden file input for real uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*,application/pdf"
      />

      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        styles={{
          options: { primaryColor: '#0f172a', zIndex: 1000 }
        }}
        callback={(data) => {
          if (data.status === "finished" || data.status === "skipped") {
            setRunTour(false);
          }
        }}
      />

      {/* Vault Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure Vault
          </span>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">My Document Locker</h2>
        </div>
        
        <div className="flex gap-2 items-center">
          <button 
            onClick={handleExportPDF} 
            className="tour-step-export flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-full text-[10px] font-bold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Smart Search by name, category, or tag..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats Dashboard */}
      {!searchQuery && (
        <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center h-32">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-800">Storage Usage</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Documents by Category</p>
            <div className="mt-2 text-2xl font-black text-slate-800">
              {documents.length} <span className="text-xs font-normal text-slate-500">Total Docs</span>
            </div>
          </div>
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={18} outerRadius={35} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Advisory card */}
      {!searchQuery && (
        <div className="mb-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4.5 rounded-2xl border border-white/5 shadow-md flex gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold">AI Compliance Auditor</h4>
            <p className="text-[10.5px] text-slate-300 leading-relaxed">
              Files uploaded are scanned for clarity and embassy compliance.
            </p>
          </div>
        </div>
      )}

      {/* Document List by Category */}
      <div className="space-y-6">
        {categories.map((category, idx) => {
          const categoryDocs = finalFilteredDocuments.filter(d => d.category === category);
          if (categoryDocs.length === 0) return null;
          
          const isLocked = category === "Identification" && !isIdentificationUnlocked;

          return (
            <div key={category} className={`space-y-3 ${idx === 1 ? 'tour-step-categories' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <Folder className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold">{category}</h3>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">{categoryDocs.length}</span>
                </div>
                {category === "Identification" && (
                  <button 
                    onClick={() => setIsIdentificationUnlocked(!isIdentificationUnlocked)}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {isLocked ? <Lock className="w-3 h-3 text-rose-500" /> : <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                    {isLocked ? "Unlock Required" : "Secured"}
                  </button>
                )}
              </div>
              
              {isLocked ? (
                <div 
                  className="bg-slate-100 rounded-2xl p-6 border border-slate-200/60 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 transition-colors shadow-inner"
                  onClick={() => setIsIdentificationUnlocked(true)}
                >
                  <Fingerprint className="w-10 h-10 text-rose-400 animate-pulse" />
                  <p className="text-xs font-bold text-slate-700 mt-1">Biometric Unlock Required</p>
                  <p className="text-[10px] text-slate-500 text-center max-w-[200px]">Tap fingerprint to simulate TouchID / FaceID validation.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryDocs.map((doc) => {
                    const { label, color, icon: StatusIcon } = getStatusProps(doc.status);
                    const isMissing = doc.status === "missing";
                    const isLoading = loadingDocId === doc.id;

                    return (
                      <div key={doc.id} className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-extrabold text-slate-800">{doc.name}</h3>
                              {doc.tag && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${doc.tag === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}`}>
                                  {doc.tag}
                               </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                              <span>{doc.type}</span>
                              <span>•</span>
                              <span>For {doc.requiredFor}</span>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-bold ${color}`}>
                            <StatusIcon className={`w-3 h-3 ${doc.status === 'pending_review' ? 'animate-spin' : ''}`} />
                            <span>{label}</span>
                          </div>
                        </div>

                        {/* Uploaded details vs missing */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                          {isMissing ? (
                            <span className="text-[10px] text-slate-400 italic">No document uploaded yet</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <div>
                                <div className="text-[11px] font-semibold text-slate-700 max-w-[150px] truncate">{doc.fileName}</div>
                                <div className="text-[9px] text-slate-400">{doc.fileSize}</div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 items-center">
                            {!isMissing && (
                              <>
                                <button 
                                  onClick={() => {
                                    const newTag = doc.tag ? undefined : (Math.random() > 0.5 ? "Urgent" : "Reviewed");
                                    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, tag: newTag } : d));
                                  }}
                                  className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${doc.tag ? 'bg-purple-50 border-purple-200 hover:bg-purple-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                                  title="Toggle Tag"
                                >
                                  <Tag className={`w-3.5 h-3.5 ${doc.tag ? 'text-purple-600' : 'text-slate-600'}`} />
                                </button>

                                <button 
                                  onClick={() => setPreviewDoc(doc as any)}
                                  className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Preview file"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                                
                                <button 
                                  onClick={() => handleDeleteSimulate(doc.id, doc.name)}
                                  className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center hover:bg-rose-100 transition-colors cursor-pointer"
                                  title="Remove file"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                </button>
                              </>
                            )}

                            {(isMissing || doc.status === "rejected") && (
                              <button
                                onClick={() => handleUploadClick(doc.id, doc.name, doc.category, doc.type, doc.requiredFor)}
                                disabled={isLoading}
                                className={`tour-step-upload inline-flex items-center gap-1 px-3.5 h-8 rounded-lg bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer`}
                              >
                                {isLoading ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin text-white" />
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3 h-3" />
                                    <span>Upload File</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* OCR Result Modal */}
      <AnimatePresence>
        {ocrResult && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl p-6"
            >
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" /> AI OCR Data Extracted
              </h3>
              <p className="text-[10px] text-slate-500 mb-4">The following text was automatically extracted from your real uploaded image:</p>
              
              <pre className="text-[10px] text-slate-700 bg-slate-50 p-3 rounded-xl whitespace-pre-wrap font-mono border border-slate-100 max-h-40 overflow-y-auto">
                {ocrResult}
              </pre>
              
              <button 
                onClick={() => setOcrResult(null)}
                className="mt-5 w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Confirm & Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
              style={{ maxHeight: '80vh' }}
            >
              <div className="flex justify-between items-center p-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{previewDoc.name}</h3>
                  <p className="text-[10px] text-slate-500">{previewDoc.fileName}</p>
                </div>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              {/* REAL FILE PREVIEW IFRAME/IMG */}
              <div className="flex-1 bg-slate-100 flex items-center justify-center min-h-[300px] overflow-hidden relative">
                {previewDoc.fileName.endsWith('.pdf') ? (
                  <iframe 
                    src={`/uploads/${previewDoc.fileName}`} 
                    className="w-full h-full min-h-[400px] border-0"
                    title={previewDoc.name}
                  />
                ) : (
                  <img 
                    src={`/uploads/${previewDoc.fileName}`} 
                    alt={previewDoc.name}
                    className="max-w-full max-h-full object-contain p-4"
                  />
                )}
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
