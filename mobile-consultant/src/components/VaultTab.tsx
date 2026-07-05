import React, { useState, useEffect } from "react";
import { 
  Folder, Upload, ShieldCheck, Eye, Trash2, Info, Lock, 
  AlertCircle, CheckCircle2, RefreshCw, Sparkles, FileText, FileCheck 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  status: "verified" | "pending_review" | "missing" | "rejected";
  fileName: string;
  fileSize: string;
  requiredFor: string;
}

interface VaultTabProps {
  onTriggerNotification: (title: string, body: string, type?: any, actionTab?: string) => void;
  colorScheme: any;
}

export default function VaultTab({ onTriggerNotification, colorScheme }: VaultTabProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([
    {
      id: "doc-1",
      name: "Passport Datapage",
      type: "Identification",
      status: "verified",
      fileName: "passport_scan_final.pdf",
      fileSize: "1.2 MB",
      requiredFor: "Visa & University",
    },
    {
      id: "doc-2",
      name: "Academic Transcript",
      type: "Academic Record",
      status: "rejected",
      fileName: "bachelors_transcript_2025.pdf",
      fileSize: "3.4 MB",
      requiredFor: "University Admission",
    },
    {
      id: "doc-3",
      name: "Statement of Purpose (SOP)",
      type: "Essay",
      status: "pending_review",
      fileName: "sop_draft_v3.docx",
      fileSize: "450 KB",
      requiredFor: "University Admission",
    },
    {
      id: "doc-4",
      name: "Blocked Account Certificate",
      type: "Financial Proof",
      status: "missing",
      fileName: "",
      fileSize: "",
      requiredFor: "Germany Visa",
    },
  ]);

  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vault/documents").then(r => r.json()).then(data => {
      if (data.documents) setDocuments(data.documents);
    }).catch(() => {});
  }, []);

  const handleUploadSimulate = (docId: string, docName: string) => {
    setLoadingDocId(docId);
    setTimeout(() => {
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === docId 
            ? { ...doc, status: "pending_review", fileName: `${docName.toLowerCase().replace(/ /g, "_")}_uploaded.pdf`, fileSize: "1.8 MB" }
            : doc
        )
      );
      setLoadingDocId(null);
      onTriggerNotification(
        "Document Uploaded", 
        `"${docName}" has been secure-uploaded and queued for AI compliance scan.`
      );
    }, 1800);
  };

  const handleDeleteSimulate = (docId: string, docName: string) => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === docId 
          ? { ...doc, status: "missing", fileName: "", fileSize: "" }
          : doc
      )
    );
    onTriggerNotification(
      "Document Removed", 
      `"${docName}" has been permanently purged from the secure vault.`
    );
  };

  // Status mapping details
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

  return (
    <div className="flex-1 bg-slate-50 p-4 font-sans select-none" style={{ fontFamily: "system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif" }}>
      
      {/* Vault Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure Vault
          </span>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">My Document Locker</h2>
        </div>
        
        <div className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>AES-256</span>
        </div>
      </div>

      {/* Advisory card */}
      <div className="mb-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4.5 rounded-2xl border border-white/5 shadow-md flex gap-3">
        <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold">AI Document Compliance Auditor</h4>
          <p className="text-[10.5px] text-slate-300 leading-relaxed">
            All files uploaded are audited for blur, signature clarity, and compliance to ensure a 100% embassy pass rate.
          </p>
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-4">
        {documents.map((doc) => {
          const { label, color, icon: StatusIcon } = getStatusProps(doc.status);
          const isMissing = doc.status === "missing";
          const isLoading = loadingDocId === doc.id;

          return (
            <div key={doc.id} className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-between">
              
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800">{doc.name}</h3>
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

                <div className="flex gap-2">
                  {!isMissing && (
                    <>
                      <button 
                        onClick={() => alert(`Viewing file: ${doc.fileName}`)}
                        className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                        title="View file"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteSimulate(doc.id, doc.name)}
                        className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center hover:bg-rose-100 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      </button>
                    </>
                  )}

                  {(isMissing || doc.status === "rejected") && (
                    <button
                      onClick={() => handleUploadSimulate(doc.id, doc.name)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 px-3.5 h-8 rounded-lg bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
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

              {/* Show error explanation if rejected */}
              {doc.status === "rejected" && (
                <div className="mt-3 p-2.5 bg-rose-50/50 rounded-xl border border-rose-100/50 flex gap-2 items-start">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-rose-700 leading-normal">
                    AI Scan rejected: Document signature occluded. Please upload a scan with clearly visible seals/signatures.
                  </p>
                </div>
              )}

            </div>
          );
        })}
      </div>
      
    </div>
  );
}
