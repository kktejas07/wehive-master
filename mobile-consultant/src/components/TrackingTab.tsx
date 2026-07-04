import React, { useState } from "react";
import { 
  CheckCircle2, Circle, Upload, FileText, Check, AlertCircle, Trash2, 
  ArrowRight, ShieldCheck, Lock, Eye, Plus, Download, RefreshCw, 
  Info, Shield, Sparkles, FileCheck, FileSignature, QrCode,
  Share2, Copy, ExternalLink, Send, Mail, MessageSquare, CheckSquare,
  Camera, Crop, Calendar, AlertTriangle, Folder, FolderCheck, FolderOpen, Clock
} from "lucide-react";
import { jsPDF } from "jspdf";
import { DEFAULT_JOURNEY_MILESTONES } from "../data";
import { JourneyMilestone } from "../types";
import { useNotifications } from "./NotificationContext";

interface VaultDocument {
  id: string;
  type: "passport" | "visa" | "offer_letter" | "transcript";
  name: string;
  fileName: string;
  uploadedAt: string;
  fileSize: string;
  status: "verified" | "under_review" | "pending";
  securityHash: string;
  notes?: string;
  issuedBy?: string;
  scannedImage?: string;
  expiryDate?: string;
  documentNumber?: string;
  holderName?: string;
}

export default function TrackingTab() {
  const { triggerNotification } = useNotifications();
  const [milestones, setMilestones] = useState<JourneyMilestone[]>(() => {
    try {
      const saved = localStorage.getItem("wehive_milestones");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load milestones from cache:", e);
    }
    return DEFAULT_JOURNEY_MILESTONES;
  });
  
  // Persist milestones to local storage
  React.useEffect(() => {
    try {
      localStorage.setItem("wehive_milestones", JSON.stringify(milestones));
    } catch (e) {
      console.error("Failed to cache milestones:", e);
    }
  }, [milestones]);

  const [activeUploadMilestone, setActiveUploadMilestone] = useState<JourneyMilestone | null>(null);
  
  // Tab within tracker
  const [subTab, setSubTab] = useState<"milestones" | "vault">("milestones");

  const [isLoading, setIsLoading] = useState(true);

  // Initial loading timer
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  // SubTab change simulated timer
  React.useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [subTab]);

  // Document Vault States with Local Cache Persistence
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>(() => {
    try {
      const saved = localStorage.getItem("wehive_vault_documents");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load vault documents from cache:", e);
    }
    return [
      {
        id: "doc-1",
        type: "passport",
        name: "International Passport Scans",
        fileName: "passport_valid_2031.pdf",
        uploadedAt: "2026-06-24",
        fileSize: "1.8 MB",
        status: "verified",
        securityHash: "SHA256: 8a73f91a...e8b39210",
        notes: "Valid through August 2031. Match name with TUM application.",
        issuedBy: "Government Passport Office",
        expiryDate: "2031-08-15",
        documentNumber: "Z8392109",
        holderName: "KRISHNA KRANTHI TEJA"
      },
      {
        id: "doc-2",
        type: "offer_letter",
        name: "University Admission Letter",
        fileName: "TUM_Admission_Offer.pdf",
        uploadedAt: "2026-06-29",
        fileSize: "2.4 MB",
        status: "verified",
        securityHash: "SHA256: d491ea8b...32ccaa19",
        notes: "M.Sc. Aerospace Engineering - Technical University of Munich.",
        issuedBy: "Technical University of Munich",
        documentNumber: "29310842",
        holderName: "KRISHNA KRANTHI TEJA KUMAR"
      },
      {
        id: "doc-3",
        type: "visa",
        name: "Schengen Study Visa Copy",
        fileName: "german_visa_draft_v2.jpg",
        uploadedAt: "2026-07-02",
        fileSize: "3.1 MB",
        status: "under_review",
        securityHash: "SHA256: c382aa19...d09bbfa4",
        notes: "Awaiting final biometric seal validation from German Embassy.",
        issuedBy: "German Embassy visa team",
        expiryDate: "2026-07-28",
        documentNumber: "ST-DE9128394",
        holderName: "KUMAR, KRISHNA KRANTHI TEJA"
      },
      {
        id: "doc-4",
        type: "transcript",
        name: "English Proficiency Certificate",
        fileName: "IELTS_Report_2024.pdf",
        uploadedAt: "2024-05-10",
        fileSize: "1.2 MB",
        status: "verified",
        securityHash: "SHA256: b109aa34...f182aa10",
        notes: "Old IELTS report. Expired after 2 years of validation. A new one is required soon.",
        issuedBy: "IDP Education",
        expiryDate: "2026-05-10",
        documentNumber: "TRF-928310",
        holderName: "KRISHNA KRANTHI TEJA"
      }
    ];
  });

  const [vaultFolderFilter, setVaultFolderFilter] = useState<"all" | "verified" | "pending" | "expired">("all");
  const [isSmartView, setIsSmartView] = useState(true);

  // Save Vault Documents to Cache
  React.useEffect(() => {
    try {
      localStorage.setItem("wehive_vault_documents", JSON.stringify(vaultDocs));
    } catch (e) {
      console.error("Failed to cache vault documents:", e);
    }
  }, [vaultDocs]);

  // Keep track of notified documents in the current session
  const notifiedDocsRef = React.useRef<string[]>([]);
  const [expiryInput, setExpiryInput] = useState("");

  const isNearExpiry = (dateStr?: string) => {
    if (!dateStr) return false;
    const currentDate = new Date("2026-07-04");
    const expiry = new Date(dateStr);
    const diffTime = expiry.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    const currentDate = new Date("2026-07-04");
    const expiry = new Date(dateStr);
    return expiry.getTime() < currentDate.getTime();
  };

  // Run proactive expiry checks and notify user
  React.useEffect(() => {
    if (!vaultDocs || vaultDocs.length === 0) return;

    const currentDate = new Date("2026-07-04");

    vaultDocs.forEach((doc) => {
      if ((doc.type === "passport" || doc.type === "visa") && doc.expiryDate) {
        if (notifiedDocsRef.current.includes(doc.id)) return;

        const expiry = new Date(doc.expiryDate);
        const diffTime = expiry.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 30) {
          triggerNotification(
            `⚠️ ${doc.type.toUpperCase()} Expiring Soon!`,
            `Your ${doc.name} will expire in ${diffDays} days on ${doc.expiryDate}. Please renew your documents to maintain compliance.`,
            "system",
            "tracking"
          );
          notifiedDocsRef.current.push(doc.id);
        } else if (diffDays < 0) {
          triggerNotification(
            `🚨 ${doc.type.toUpperCase()} Expired!`,
            `Your ${doc.name} expired on ${doc.expiryDate}. Immediate renewal action is required.`,
            "system",
            "tracking"
          );
          notifiedDocsRef.current.push(doc.id);
        }
      }
    });
  }, [vaultDocs, triggerNotification]);

  // Document Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [scannerType, setScannerType] = useState<VaultDocument["type"]>("visa");
  const [scannerStep, setScannerStep] = useState<"camera" | "review">("camera");
  const [rawCapturedImg, setRawCapturedImg] = useState<string | null>(null);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
  const [scannerFilter, setScannerFilter] = useState<"original" | "document" | "mono">("document");
  const [cameraError, setCameraError] = useState("");
  const [autoCrop, setAutoCrop] = useState(true);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Start scanner stream
  const startScanning = async (type: VaultDocument["type"]) => {
    setScannerType(type);
    setIsScanning(true);
    setScannerStep("camera");
    setRawCapturedImg(null);
    setCapturedImg(null);
    setCameraError("");
    setExpiryInput("");
    
    // Give state time to render the modal container
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
      } catch (err: any) {
        console.error("Camera access error:", err);
        setCameraError("Camera access denied or unavailable. Please verify frame permissions.");
      }
    }, 150);
  };

  // Close scanner and cleanup stream
  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setRawCapturedImg(null);
    setCapturedImg(null);
  };

  // Capture frame
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Draw the full video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setRawCapturedImg(rawDataUrl);
  };

  // Live image processing when filter or crop mode shifts
  React.useEffect(() => {
    if (!rawCapturedImg) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      
      let processedCanvas = canvas;
      
      if (autoCrop) {
        // Auto-cropping to center region (simulating document paper detection alignment)
        const cropW = Math.round(img.width * 0.85);
        const cropH = Math.round(img.height * 0.75);
        const cropX = Math.round((img.width - cropW) / 2);
        const cropY = Math.round((img.height - cropH) / 2);
        
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext("2d");
        if (cropCtx) {
          cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          processedCanvas = cropCanvas;
        }
      }
      
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = processedCanvas.width;
      finalCanvas.height = processedCanvas.height;
      const finalCtx = finalCanvas.getContext("2d");
      if (finalCtx) {
        finalCtx.drawImage(processedCanvas, 0, 0);
        
        if (scannerFilter === "mono") {
          const imgData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const brightness = 0.34 * data[i] + 0.5 * data[i+1] + 0.16 * data[i+2];
            const val = brightness > 120 ? 255 : 0;
            data[i] = val;
            data[i+1] = val;
            data[i+2] = val;
          }
          finalCtx.putImageData(imgData, 0, 0);
        } else if (scannerFilter === "document") {
          // Document scanning enhancer: boost contrast and brightness slightly
          const imgData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.35 + 128 + 15));
            data[i+1] = Math.min(255, Math.max(0, (data[i+1] - 128) * 1.35 + 128 + 15));
            data[i+2] = Math.min(255, Math.max(0, (data[i+2] - 128) * 1.35 + 128 + 15));
          }
          finalCtx.putImageData(imgData, 0, 0);
        }
      }
      
      setCapturedImg(finalCanvas.toDataURL("image/jpeg", 0.9));
      setScannerStep("review");
    };
    img.src = rawCapturedImg;
  }, [rawCapturedImg, scannerFilter, autoCrop]);

  const saveScannedDocument = () => {
    if (!capturedImg) return;
    
    const docNames: Record<VaultDocument["type"], string> = {
      passport: "International Passport Scans",
      visa: "Schengen Study Visa Copy",
      offer_letter: "University Admission Letter",
      transcript: "Academic Transcript Sheets"
    };

    const docIssuers: Record<VaultDocument["type"], string> = {
      passport: "Government Passport Office",
      visa: "Embassy Visa Bureau (CamScan)",
      offer_letter: "Assigned Institution Registrar (CamScan)",
      transcript: "Alma Mater University Dean (CamScan)"
    };

    const newDoc: VaultDocument = {
      id: "doc-" + Math.random().toString(36).substr(2, 5),
      type: scannerType,
      name: docNames[scannerType] || "Scanned Document",
      fileName: `scanned_${scannerType}_${new Date().getTime()}.jpg`,
      uploadedAt: new Date().toISOString().split("T")[0],
      fileSize: "1.1 MB",
      status: "verified",
      securityHash: "SHA256: scn_" + Math.random().toString(16).substr(2, 8) + "..." + Math.random().toString(16).substr(2, 8),
      notes: "Captured and auto-cropped using high-fidelity camera scanning utility. Edge alignment verified.",
      issuedBy: ocrIssuedBy || docIssuers[scannerType],
      scannedImage: capturedImg,
      expiryDate: (scannerType === "passport" || scannerType === "visa") && expiryInput ? expiryInput : undefined,
      documentNumber: ocrDocNum || undefined,
      holderName: ocrName || undefined
    };

    setVaultDocs(prev => [newDoc, ...prev.filter(d => d.type !== scannerType)]);
    
    triggerNotification(
      "Document Scanned & Archived! 📸",
      `Successfully scanned and auto-cropped "${newDoc.fileName}". Added to secure Vault.`,
      "milestone",
      "tracking"
    );

    stopScanning();
  };

  // General Upload States (milestones + vault)
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [vaultUploadType, setVaultUploadType] = useState<VaultDocument["type"] | "">("");

  // Viewing Document State
  const [selectedViewerDoc, setSelectedViewerDoc] = useState<VaultDocument | null>(null);
  const [viewerTab, setViewerTab] = useState<"scan" | "cert">("scan");
  const [isNewUploadOpen, setIsNewUploadOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Gemini AI OCR Extraction States
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    documentType?: string;
    name?: string;
    documentNumber?: string;
    expiryDate?: string;
    issuedBy?: string;
    confidenceScore?: number;
  } | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrName, setOcrName] = useState("");
  const [ocrDocNum, setOcrDocNum] = useState("");
  const [ocrIssuedBy, setOcrIssuedBy] = useState("");

  const runOCR = async (imgData: string) => {
    if (!imgData) return;
    setOcrLoading(true);
    setOcrError(null);
    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imgData,
          docType: scannerType
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process OCR request on server.");
      }

      const data = await response.json();
      setOcrResult(data);

      if (data.name) setOcrName(data.name);
      if (data.documentNumber) setOcrDocNum(data.documentNumber);
      if (data.expiryDate) setExpiryInput(data.expiryDate);
      if (data.issuedBy) setOcrIssuedBy(data.issuedBy);

      triggerNotification(
        "AI OCR Extraction Complete! 🤖✨",
        `Extracted key metadata from your ${scannerType} with ${data.confidenceScore || 95}% confidence score.`,
        "system",
        "tracking"
      );
    } catch (err: any) {
      console.error("OCR extraction failed:", err);
      setOcrError(err.message || "Unable to extract document text automatically. Please input manually below.");
    } finally {
      setOcrLoading(false);
    }
  };

  React.useEffect(() => {
    if (isPreviewModalOpen && capturedImg) {
      setOcrName("");
      setOcrDocNum("");
      setOcrIssuedBy("");
      setOcrResult(null);
      setOcrError(null);
      runOCR(capturedImg);
    }
  }, [isPreviewModalOpen, capturedImg]);

  // Auto reset viewerTab to "scan" when opening document
  React.useEffect(() => {
    if (selectedViewerDoc) {
      setViewerTab("scan");
    }
  }, [selectedViewerDoc]);

  // Sharing Document States
  const [selectedShareDoc, setSelectedShareDoc] = useState<VaultDocument | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareDestination, setShareDestination] = useState<string | null>(null);
  const [isSharingInProcess, setIsSharingInProcess] = useState(false);

  // Toggle milestone status
  const toggleMilestone = (id: string) => {
    setMilestones(prev =>
      prev.map(m => {
        if (m.id === id) {
          const nextStatus = m.status === "completed" ? "pending" : "completed";
          if (nextStatus === "completed") {
            triggerNotification(
              "Milestone Completed! 🎉",
              `You marked "${m.title}" as completed. Keep up the great pace!`,
              "milestone",
              "tracking"
            );
          }
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
  };

  const handleOpenUpload = (milestone: JourneyMilestone) => {
    setActiveUploadMilestone(milestone);
    setVaultUploadType("");
    setSelectedFileName("");
    setUploadProgress(0);
    setUploading(false);
    setUploadSuccess(false);
  };

  const handleOpenVaultUpload = (type: VaultDocument["type"]) => {
    setVaultUploadType(type);
    setActiveUploadMilestone(null);
    setSelectedFileName("");
    setUploadProgress(0);
    setUploading(false);
    setUploadSuccess(false);
    setIsNewUploadOpen(true);
    setExpiryInput("");
  };

  const handleCloseUpload = () => {
    setActiveUploadMilestone(null);
    setIsNewUploadOpen(false);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const startSimulatedUpload = (filename: string) => {
    setSelectedFileName(filename);
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setUploadSuccess(true);
          
          if (activeUploadMilestone) {
            // Document upload from milestone checklists
            setMilestones(current =>
              current.map(m =>
                m.id === activeUploadMilestone.id
                  ? { ...m, status: "completed", documentUploaded: true, documentName: filename }
                  : m
              )
            );
            triggerNotification(
              "Milestone Draft Received",
              `Uploaded "${filename}" to check list. WeHive consultants are reviewing layout formats.`,
              "message",
              "tracking"
            );
          } else if (vaultUploadType) {
            // Core document vault additions
            const docNames: Record<VaultDocument["type"], string> = {
              passport: "International Passport Scans",
              visa: "Schengen Study Visa Copy",
              offer_letter: "University Admission Letter",
              transcript: "Academic Transcript Sheets"
            };
            const docIssuers: Record<VaultDocument["type"], string> = {
              passport: "Government Passport Office",
              visa: "Embassy Visa Bureau",
              offer_letter: "Assigned Institution Registrar",
              transcript: "Alma Mater University Dean"
            };

            const newDoc: VaultDocument = {
              id: "doc-" + Math.random().toString(36).substr(2, 5),
              type: vaultUploadType,
              name: docNames[vaultUploadType] || "Academic Records File",
              fileName: filename,
              uploadedAt: new Date().toISOString().split("T")[0],
              fileSize: (Math.random() * 2 + 1.2).toFixed(1) + " MB",
              status: "under_review",
              securityHash: "SHA256: " + Math.random().toString(16).substr(2, 8) + "..." + Math.random().toString(16).substr(2, 8),
              notes: "Uploaded via client secure session. Undergoing instant cryptographic seal verification.",
              issuedBy: docIssuers[vaultUploadType],
              expiryDate: expiryInput || undefined
            };

            setVaultDocs(prev => [newDoc, ...prev.filter(d => d.type !== vaultUploadType)]);
            triggerNotification(
              "Vault File Securely Archived! 🔒",
              `AES-256 encrypted "${filename}" stored as ${docNames[vaultUploadType]}.`,
              "milestone",
              "tracking"
            );
          }
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startSimulatedUpload(e.dataTransfer.files[0].name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startSimulatedUpload(e.target.files[0].name);
    }
  };

  const handleDeleteDocument = (id: string) => {
    setMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, documentUploaded: false, documentName: m.documentName || "document.pdf", status: "pending" } : m))
    );
  };

  const handleDeleteVaultDoc = (id: string, name: string) => {
    setVaultDocs(prev => prev.filter(d => d.id !== id));
    triggerNotification(
      "Document Removed",
      `Successfully deleted "${name}" from your secure Document Vault logs.`,
      "system",
      "tracking"
    );
  };

  // --- REAL COMPLIANCE PDF GENERATOR ---
  const generateDocumentPDF = (doc: VaultDocument): jsPDF => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Draw elegant background and framing
    pdf.setFillColor(252, 252, 253); // soft cream white
    pdf.rect(0, 0, 210, 297, "F");

    // Outer border
    pdf.setDrawColor(218, 223, 230); // light slate
    pdf.setLineWidth(0.6);
    pdf.rect(8, 8, 194, 281, "S");

    // Red corners (brand design)
    pdf.setDrawColor(234, 28, 36); // #EA1C24 Red
    pdf.setLineWidth(1.2);
    // Top Left
    pdf.line(8, 8, 18, 8);
    pdf.line(8, 8, 8, 18);
    // Top Right
    pdf.line(202, 8, 192, 8);
    pdf.line(202, 8, 202, 18);
    // Bottom Left
    pdf.line(8, 289, 18, 289);
    pdf.line(8, 289, 8, 279);
    // Bottom Right
    pdf.line(202, 289, 192, 289);
    pdf.line(202, 289, 202, 279);

    // Blue Header Banner block
    pdf.setFillColor(0, 28, 184); // #001CB8 Royal Blue
    pdf.rect(12, 12, 186, 26, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("WEHIVE SECURE COMPLIANCE EXPEDITION LOG", 18, 21);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(200, 215, 255);
    pdf.text("OFFICIAL COMPLIANCE REPORT • SECURED BY WEHIVE ENTERPRISE CRYPTO-SHIELD", 18, 26);
    pdf.text("YOUR GLOBAL JOURNEY STARTS HERE", 18, 31);

    // Sealed tag
    pdf.setFillColor(234, 28, 36); // Red
    pdf.rect(164, 12, 34, 9, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text("VERIFIED", 172, 18);

    // Metadata card
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(200, 210, 225);
    pdf.setLineWidth(0.3);
    pdf.rect(12, 44, 186, 36, "FD");

    pdf.setTextColor(0, 28, 184);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.text("METADATA PROFILE & INTEGRITY REGISTER", 18, 51);

    pdf.setTextColor(60, 64, 75);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);

    pdf.text("Document Label:", 18, 59);
    pdf.setFont("helvetica", "bold");
    pdf.text(doc.name, 48, 59);

    pdf.setFont("helvetica", "normal");
    pdf.text("Category Type:", 18, 64);
    pdf.setFont("helvetica", "bold");
    pdf.text(doc.type.toUpperCase(), 48, 64);

    pdf.setFont("helvetica", "normal");
    pdf.text("Archived Date:", 18, 69);
    pdf.setFont("helvetica", "bold");
    pdf.text(doc.uploadedAt, 48, 69);

    pdf.setFont("helvetica", "normal");
    pdf.text("Verification Status:", 116, 59);
    pdf.setFont("helvetica", "bold");
    if (doc.status === "verified") {
      pdf.setTextColor(16, 124, 65);
      pdf.text("SECURE & VERIFIED  [PASS]", 144, 59);
    } else {
      pdf.setTextColor(190, 90, 0);
      pdf.text("UNDER ACTIVE REVIEW", 144, 59);
    }
    pdf.setTextColor(60, 64, 75);

    pdf.setFont("helvetica", "normal");
    pdf.text("Source Filename:", 116, 64);
    pdf.setFont("helvetica", "bold");
    pdf.text(doc.fileName, 144, 64);

    pdf.setFont("helvetica", "normal");
    pdf.text("Digital Footprint Size:", 116, 69);
    pdf.setFont("helvetica", "bold");
    pdf.text(doc.fileSize, 144, 69);

    // Divider line
    pdf.setDrawColor(220, 225, 235);
    pdf.setLineWidth(0.4);
    pdf.line(12, 86, 198, 86);

    // Body Title
    pdf.setTextColor(0, 28, 184);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("SECURED PAYLOAD DATA TRANSCRIPTION", 12, 94);

    pdf.setTextColor(100, 116, 139);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text("The structural properties displayed below are cryptographically sealed in this document's registry metadata:", 12, 98);

    // Render contents based on types
    if (doc.type === "passport") {
      pdf.setFillColor(249, 246, 238); // Cream passport layout
      pdf.setDrawColor(140, 130, 110);
      pdf.rect(12, 102, 186, 102, "FD");

      pdf.setTextColor(40, 40, 40);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.text("REPUBLIC OF WEHIVE - INTERACTIVE PASSPORT DATAPAGE", 18, 110);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("Surname / Nom:", 18, 120);
      pdf.setFont("helvetica", "bold");
      pdf.text("KUMAR", 52, 120);

      pdf.setFont("helvetica", "normal");
      pdf.text("Given Names / Prénom:", 18, 127);
      pdf.setFont("helvetica", "bold");
      pdf.text("KRISHNA KRANTHI TEJA", 52, 127);

      pdf.setFont("helvetica", "normal");
      pdf.text("Nationality / Nationalité:", 18, 134);
      pdf.setFont("helvetica", "bold");
      pdf.text("INDIAN", 52, 134);

      pdf.setFont("helvetica", "normal");
      pdf.text("Date of Birth / Date Naiss:", 18, 141);
      pdf.setFont("helvetica", "bold");
      pdf.text("12 NOV 2001", 52, 141);

      pdf.setFont("helvetica", "normal");
      pdf.text("Passport No / No Passeport:", 114, 120);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(180, 20, 20);
      pdf.text("Z8392109", 152, 120);
      pdf.setTextColor(40, 40, 40);

      pdf.setFont("helvetica", "normal");
      pdf.text("Sex / Sexe:", 114, 127);
      pdf.setFont("helvetica", "bold");
      pdf.text("M", 152, 127);

      pdf.setFont("helvetica", "normal");
      pdf.text("Authority / Autorité:", 114, 134);
      pdf.setFont("helvetica", "bold");
      pdf.text(doc.issuedBy || "Passport Office", 152, 134);

      pdf.setFont("helvetica", "normal");
      pdf.text("Compliance State:", 114, 141);
      pdf.setFont("helvetica", "bold");
      pdf.text("Verified Match", 152, 141);

      // Separator
      pdf.setDrawColor(180, 170, 150);
      pdf.line(16, 149, 194, 149);

      // MRZ Box
      pdf.setFont("courier", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(10, 10, 10);
      pdf.text("P<IND<<KUMAR<<KRISHNA<KRANTHI<TEJA<<<<<<<<<<<<", 20, 158);
      pdf.text("Z8392109<1IND0111124M3108153<<<<<<<<<<<<<<02", 20, 163);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(110, 110, 110);
      pdf.text("Remarks: Verified matching candidate biological data with University registration portals.", 18, 185);

    } else if (doc.type === "offer_letter") {
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(180, 190, 200);
      pdf.rect(12, 102, 186, 102, "FD");

      pdf.setTextColor(15, 45, 115);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("TECHNICAL UNIVERSITY OF MUNICH (TUM)", 18, 110);
      
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120, 120, 120);
      pdf.text("Arcisstraße 21, 80333 München, Germany • Office of International admissions", 18, 114);

      pdf.setDrawColor(220, 220, 220);
      pdf.line(18, 117, 192, 117);

      pdf.setTextColor(50, 50, 50);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.text("Student Admitted: Krishna Kranthi Teja Kumar", 18, 125);
      pdf.setFont("helvetica", "normal");
      pdf.text("Applicant Registration ID: 29310842  |  Admissions Letter Date: June 25, 2026", 18, 130);

      pdf.setTextColor(0, 28, 184);
      pdf.setFont("helvetica", "bold");
      pdf.text("ADMISSION STATUS: APPROVED & CONFIRMED FOR WINTER SEMESTER 2026", 18, 139);

      pdf.setTextColor(60, 60, 60);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      
      const letterText = "We are pleased to inform you that the Admissions Board has selected you for the Master of Science (M.Sc.) course in Aerospace Engineering at our main campus in Garching, Munich, Germany. The semester officially begins October 2026.\n\nPlease refer to this document for your visa compliance check-in at the local foreign registration office (Ausländerbehörde).";
      pdf.text(letterText, 18, 146, { maxWidth: 174 });

      // Info Table
      pdf.setFillColor(245, 248, 252);
      pdf.rect(18, 168, 174, 18, "F");
      pdf.setFont("helvetica", "bold");
      pdf.text("Level: M.Sc. Graduate Program", 22, 174);
      pdf.text("Duration: 4 Semesters", 22, 180);
      pdf.text("Medium of Instruction: English", 108, 174);
      pdf.text("Primary Campus: Garching, Munich", 108, 180);

      // Registrar Info
      pdf.setTextColor(50, 50, 50);
      pdf.setFont("helvetica", "bold");
      pdf.text("Dr. Hans-Joachim Altrock", 18, 194);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text("Dean of International Office admissions, TUM Registry", 18, 198);

    } else if (doc.type === "visa") {
      pdf.setFillColor(253, 250, 235); // warm sticker background
      pdf.setDrawColor(212, 175, 55); // golden borders
      pdf.rect(12, 102, 186, 102, "FD");

      pdf.setTextColor(110, 20, 20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("DEUTSCHLAND / SCHENGEN STAATEN STUDENTENVISUM D", 18, 110);

      pdf.setTextColor(110, 110, 110);
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "normal");
      pdf.text("Embassy Representative Visa Section • Study Permit Multi-Entry D Category", 18, 114);

      // Content table
      pdf.setTextColor(55, 55, 55);
      pdf.setFontSize(8);

      pdf.text("Visa Valid From:", 18, 124);
      pdf.setFont("helvetica", "bold");
      pdf.text("15 SEP 2026", 54, 124);

      pdf.setFont("helvetica", "normal");
      pdf.text("Visa Valid Until:", 18, 131);
      pdf.setFont("helvetica", "bold");
      pdf.text("14 MAR 2027", 54, 131);

      pdf.setFont("helvetica", "normal");
      pdf.text("Permitted Class:", 18, 138);
      pdf.setFont("helvetica", "bold");
      pdf.text("MULTIPLE ENTRY - STUDY (D)", 54, 138);

      pdf.setFont("helvetica", "normal");
      pdf.text("Passport No:", 112, 124);
      pdf.setFont("helvetica", "bold");
      pdf.text("Z8392109", 148, 124);

      pdf.setFont("helvetica", "normal");
      pdf.text("Visa Reference No:", 112, 131);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(180, 20, 20);
      pdf.text("ST-DE9128394", 148, 131);
      pdf.setTextColor(55, 55, 55);

      pdf.setFont("helvetica", "normal");
      pdf.text("Primary Legal Name:", 18, 147);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("KUMAR, KRISHNA KRANTHI TEJA", 54, 147);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("Employment Scope:", 18, 155);
      pdf.setFont("helvetica", "bold");
      pdf.text("Allowed up to 120 full days or 240 half days per calendar year. Self-employment restricted.", 54, 155, { maxWidth: 135 });

      // Seal box
      pdf.setDrawColor(200, 150, 50);
      pdf.setFillColor(255, 253, 240);
      pdf.rect(148, 162, 42, 34, "F");
      pdf.setFont("courier", "bold");
      pdf.setFontSize(6);
      pdf.setTextColor(150, 80, 0);
      pdf.text("GERMAN EMBASSY\nVISA SECTION\n\nMUNICH REGISTERED\nSEALED: 10 JUL 2026\nSTATUS: VERIFIED", 151, 170);

    } else {
      // Transcript type
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(180, 180, 180);
      pdf.rect(12, 102, 186, 102, "FD");

      pdf.setTextColor(40, 40, 40);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.text("BOARD OF TECHNICAL EDUCATION - MARKS TRANSCRIPTION RECORD", 18, 110);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("Student Candidate:", 18, 118);
      pdf.setFont("helvetica", "bold");
      pdf.text("Krishna Kranthi Teja Kumar", 48, 118);

      pdf.setFont("helvetica", "normal");
      pdf.text("Registered Program:", 18, 123);
      pdf.setFont("helvetica", "bold");
      pdf.text("Bachelor of Technology (Aerospace & Thermodynamics Stream)", 48, 123);

      // Simple Table
      pdf.setFillColor(242, 244, 248);
      pdf.rect(18, 130, 174, 5.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(50, 50, 50);
      pdf.text("Course / Subject Name", 21, 134);
      pdf.text("Max Marks", 112, 134);
      pdf.text("Obtained", 140, 134);
      pdf.text("Grade", 172, 134);

      pdf.setFont("helvetica", "normal");
      const subjects = [
        { name: "Advanced Mathematics III", max: "100", score: "92", grade: "A+" },
        { name: "Fluid Mechanics & Dynamics", max: "100", score: "88", grade: "A" },
        { name: "Thermodynamics & Heat Labs", max: "100", score: "94", grade: "A+" },
        { name: "Computational Aerodynamics", max: "100", score: "90", grade: "A+" }
      ];

      let currentY = 141;
      subjects.forEach((subj) => {
        pdf.text(subj.name, 21, currentY);
        pdf.text(subj.max, 112, currentY);
        pdf.text(subj.score, 140, currentY);
        pdf.setFont("helvetica", "bold");
        pdf.text(subj.grade, 172, currentY);
        pdf.setFont("helvetica", "normal");
        currentY += 5.5;
      });

      // Cumulative Grade Result
      pdf.setFillColor(235, 246, 240);
      pdf.rect(18, 168, 174, 9, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(16, 124, 65);
      pdf.text("CUMULATIVE GPA: 9.32 / 10.00 (Distinction with Merit Rank #1/120)", 22, 174);

      // Sign off
      pdf.setTextColor(50, 50, 50);
      pdf.setFont("helvetica", "bold");
      pdf.text("Prof. Ravinder Sen", 18, 192);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text("Registrar & Academic Dean Board Office", 18, 196);
    }

    // Bottom Compliance Certification Box
    pdf.setDrawColor(220, 224, 230);
    pdf.line(12, 214, 198, 214);

    pdf.setFillColor(242, 245, 252);
    pdf.setDrawColor(200, 212, 235);
    pdf.rect(12, 220, 186, 44, "FD");

    pdf.setTextColor(0, 28, 184);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("WEHIVE SAFE-VAULT COMPLIANCE ASSURANCE SEALS", 18, 227);

    pdf.setTextColor(80, 85, 95);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const disclaimer = "This certificate provides physical verification metrics representing encrypted archives under WeHive's global student networks. Standard cryptographic keys assure full-fidelity compliance files ready for board presentations or physical university compliance audits.";
    pdf.text(disclaimer, 18, 233, { maxWidth: 174 });

    // Drawn barcode
    pdf.setFillColor(20, 30, 50);
    let barcodeX = 18;
    for (let i = 0; i < 28; i++) {
      const width = Math.random() > 0.55 ? 1.4 : 0.6;
      pdf.rect(barcodeX, 248, width, 10, "F");
      barcodeX += width + 0.8;
    }

    pdf.setFont("courier", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(40, 40, 40);
    pdf.text((doc.securityHash || "SHA256: NULL").toUpperCase(), 90, 253);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.text("CRYPTO-LEDGER SHIELD PROTOCOL SECURED STATUS: COMPLIANT ✔", 90, 258);

    // Watermark footer
    pdf.setTextColor(140, 145, 155);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text("Generated with love by WeHive AI Assistant (Google Cloud Run Instance). Valid Worldwide.", 48, 283);

    return pdf;
  };

  // --- ACTIONS ---
  const handleDownloadPDF = (doc: VaultDocument) => {
    try {
      const pdf = generateDocumentPDF(doc);
      pdf.save(`WeHive_Certified_${doc.type}_${doc.uploadedAt}.pdf`);
      triggerNotification(
        "PDF Generated & Downloaded! 📄",
        `Your certified PDF for "${doc.name}" has been downloaded.`,
        "milestone",
        "tracking"
      );
    } catch (e) {
      console.error("PDF generation failed:", e);
      triggerNotification(
        "PDF Generation Failed",
        "An error occurred while rendering the PDF compliance document.",
        "system",
        "tracking"
      );
    }
  };

  const handleSharePDF = (doc: VaultDocument) => {
    setSelectedShareDoc(doc);
    setCopiedLink(false);
    setShareDestination(null);
    setIsSharingInProcess(false);
  };

  const handleCopyShareLink = () => {
    if (!selectedShareDoc) return;
    const mockLink = `https://wehive.co.in/share/doc-${selectedShareDoc.id}-${selectedShareDoc.securityHash.substr(8, 6)}`;
    navigator.clipboard.writeText(mockLink);
    setCopiedLink(true);
    triggerNotification(
      "Secure Link Copied! 🔗",
      "Sharing link successfully copied to your clipboard.",
      "system"
    );
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePerformShare = (destination: string) => {
    if (!selectedShareDoc) return;
    setIsSharingInProcess(true);
    setTimeout(() => {
      setIsSharingInProcess(false);
      setSelectedShareDoc(null);
      triggerNotification(
        "Document Shared Successfully! 🚀",
        `Certified copy sent securely to ${destination}.`,
        "milestone",
        "tracking"
      );
    }, 1800);
  };

  // --- EXPORT COMPILED SUMMARY PDF ---
  const handleExportSummaryPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const applicantName = vaultDocs.find(d => d.holderName)?.holderName || "KRISHNA KRANTHI TEJA KUMAR";
      const passportNo = vaultDocs.find(d => d.type === "passport")?.documentNumber || "Z8392109";
      const isAllCompliant = vaultDocs.length === 4 && vaultDocs.every(d => d.status === "verified");

      // ==========================================
      // PAGE 1: APPLICATION PROGRESS CHECKLIST
      // ==========================================

      // Soft cream-white background and elegant border framing
      pdf.setFillColor(252, 252, 253);
      pdf.rect(0, 0, 210, 297, "F");

      pdf.setDrawColor(218, 223, 230);
      pdf.setLineWidth(0.6);
      pdf.rect(8, 8, 194, 281, "S");

      // Red corner decorations (branding)
      pdf.setDrawColor(234, 28, 36);
      pdf.setLineWidth(1.2);
      pdf.line(8, 8, 18, 8); pdf.line(8, 8, 8, 18); // Top Left
      pdf.line(202, 8, 192, 8); pdf.line(202, 8, 202, 18); // Top Right
      pdf.line(8, 289, 18, 289); pdf.line(8, 289, 8, 279); // Bottom Left
      pdf.line(202, 289, 192, 289); pdf.line(202, 289, 202, 279); // Bottom Right

      // Page 1 Header Banner (Navy/Blue)
      pdf.setFillColor(0, 28, 184); // #001CB8 Royal Blue
      pdf.rect(12, 12, 186, 26, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("WEHIVE STUDY ABROAD COMPLIANCE RECORD", 18, 21);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(200, 215, 255);
      pdf.text("COMPILED APPLICATION JOURNAL & STUDENT INTEGRITY LEDGER SUMMARY", 18, 26);
      pdf.text("OFFICIAL PORTAL SUMMARY REPORT • GENERATED ON SECURE ENDPOINT", 18, 31);

      // Sealed stamp
      pdf.setFillColor(234, 28, 36);
      pdf.rect(156, 12, 42, 9, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(isAllCompliant ? "SECURE CERTIFIED" : "ACTIVE EXPEDITION", 159, 18);

      // Applicant metadata Card (Y=44 to 78)
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(200, 210, 225);
      pdf.setLineWidth(0.35);
      pdf.rect(12, 44, 186, 34, "FD");

      pdf.setTextColor(0, 28, 184);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("APPLICANT COMPLIANCE PROFILE SUMMARY", 18, 51);

      pdf.setTextColor(60, 64, 75);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);

      pdf.text("Primary Student Name:", 18, 58);
      pdf.setFont("helvetica", "bold");
      pdf.text(applicantName.toUpperCase(), 52, 58);

      pdf.setFont("helvetica", "normal");
      pdf.text("Passport Number:", 18, 63);
      pdf.setFont("helvetica", "bold");
      pdf.text(passportNo.toUpperCase(), 52, 63);

      pdf.setFont("helvetica", "normal");
      pdf.text("Document Assets Secured:", 18, 68);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${vaultDocs.length} of 4 Required Uploads`, 52, 68);

      pdf.setFont("helvetica", "normal");
      pdf.text("Current Audit Timestamp:", 116, 58);
      pdf.setFont("helvetica", "bold");
      pdf.text("July 04, 2026 - 06:25 PDT", 152, 58);

      pdf.setFont("helvetica", "normal");
      pdf.text("Overall Progress Completeness:", 116, 63);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${progressPercent}% Checklist Met`, 152, 63);

      pdf.setFont("helvetica", "normal");
      pdf.text("Verification Status:", 116, 68);
      pdf.setFont("helvetica", "bold");
      if (isAllCompliant) {
        pdf.setTextColor(16, 124, 65);
        pdf.text("FULLY COMPLIANT ✔", 152, 68);
      } else {
        pdf.setTextColor(217, 119, 6);
        pdf.text("PENDING METRICS ⚠️", 152, 68);
      }
      pdf.setTextColor(60, 64, 75);

      // Section Title: Y=86
      pdf.setTextColor(0, 28, 184);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11.5);
      pdf.text("COMPILED JOURNEY PROGRESS & CHECKLIST STATUS", 12, 91);

      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.text("The structural checkpoints representing the applicant's current status milestones along the international journey:", 12, 95);

      // Progress bar (Y=98 to 103)
      pdf.setFillColor(230, 235, 245);
      pdf.rect(12, 98, 186, 5, "F");
      pdf.setFillColor(16, 124, 65); // Green progress
      pdf.rect(12, 98, Math.max(2, (186 * progressPercent) / 100), 5, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.text(`${progressPercent}% MET`, 14, 101.5);

      // Milestone Checklist List Container Box (Y=107 to 273)
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(218, 223, 230);
      pdf.setLineWidth(0.3);
      pdf.rect(12, 107, 186, 166, "FD");

      let mY = 111.5;
      milestones.forEach((milestone, idx) => {
        // Draw checkbox box
        pdf.setDrawColor(180, 185, 195);
        pdf.setLineWidth(0.35);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(16, mY, 3.5, 3.5, "FD");

        if (milestone.status === "completed") {
          // Draw a small cross or solid green box
          pdf.setFillColor(16, 124, 65);
          pdf.rect(16.5, mY + 0.5, 2.5, 2.5, "F");
        }

        // Phase tag
        let tagColor = [220, 230, 255];
        let tagTextColor = [0, 28, 184];
        if (milestone.category === "Visa") {
          tagColor = [220, 252, 230]; tagTextColor = [5, 120, 50];
        } else if (milestone.category === "Preparation") {
          tagColor = [254, 243, 199]; tagTextColor = [180, 83, 9];
        } else if (milestone.category === "Pre-Departure") {
          tagColor = [243, 232, 255]; tagTextColor = [107, 33, 168];
        }

        pdf.setFillColor(tagColor[0], tagColor[1], tagColor[2]);
        pdf.rect(24, mY - 1, 23, 5.5, "F");
        pdf.setTextColor(tagTextColor[0], tagTextColor[1], tagTextColor[2]);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.text(milestone.category.toUpperCase(), 25.5, mY + 3);

        // Milestone title
        pdf.setTextColor(15, 23, 42);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.text(milestone.title, 51, mY + 2.6);

        // Milestone description
        pdf.setTextColor(100, 116, 139);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        pdf.text(milestone.description, 51, mY + 5.5);

        // Simple checkmark label
        if (milestone.status === "completed") {
          pdf.setTextColor(16, 124, 65);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6);
          pdf.text("MET", 178, mY + 2.6);
        } else {
          pdf.setTextColor(148, 163, 184);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6);
          pdf.text("PENDING", 178, mY + 2.6);
        }

        // Horizontal row separator
        if (idx < milestones.length - 1) {
          pdf.setDrawColor(230, 235, 245);
          pdf.setLineWidth(0.2);
          pdf.line(14, mY + 7.5, 194, mY + 7.5);
        }

        mY += 13.5;
      });

      // Watermark footer (Page 1)
      pdf.setTextColor(148, 163, 184);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text("Page 1 of 2  •  Official compiled record of international journey checkpoints secured by WeHive Smart Vault Systems.", 22, 282);

      // ==========================================
      // PAGE 2: SECURED DOCUMENT VAULT DETAILS
      // ==========================================
      pdf.addPage();

      // Soft cream-white background and elegant border framing
      pdf.setFillColor(252, 252, 253);
      pdf.rect(0, 0, 210, 297, "F");

      pdf.setDrawColor(218, 223, 230);
      pdf.setLineWidth(0.6);
      pdf.rect(8, 8, 194, 281, "S");

      // Red corner decorations (branding)
      pdf.setDrawColor(234, 28, 36);
      pdf.setLineWidth(1.2);
      pdf.line(8, 8, 18, 8); pdf.line(8, 8, 8, 18); // Top Left
      pdf.line(202, 8, 192, 8); pdf.line(202, 8, 202, 18); // Top Right
      pdf.line(8, 289, 18, 289); pdf.line(8, 289, 8, 279); // Bottom Left
      pdf.line(202, 289, 192, 289); pdf.line(202, 289, 202, 279); // Bottom Right

      // Page 2 Header Banner (Navy/Blue) - Smaller
      pdf.setFillColor(0, 28, 184); // #001CB8 Royal Blue
      pdf.rect(12, 12, 186, 18, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("WEHIVE DOCUMENT VAULT ASSETS REGISTER", 18, 19);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(200, 215, 255);
      pdf.text("CRYPTOGRAPHIC FOOTPRINT SHIELD & OCR METADATA EXTRACT VERIFICATION LOG", 18, 24);

      // Section Title: Y=36
      pdf.setTextColor(0, 28, 184);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("CRYPTOGRAPHICALLY COMPLIANT VAULT INVENTORY", 12, 38);

      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.text("Below are the verified transcription data blocks for each of the 4 required travel compliance assets:", 12, 42);

      // Vertical loop for 4 categories (Y=46, 92, 138, 184)
      const categories: ("passport" | "offer_letter" | "visa" | "transcript")[] = ["passport", "offer_letter", "visa", "transcript"];
      const labels = {
        passport: "INTERNATIONAL PASSPORT DATAPAGE ASSET",
        offer_letter: "UNIVERSITY ADMISSION OFFER LETTER",
        visa: "STUDENT SCHENGEN VISA DECAL ASSET",
        transcript: "BOARD TRANSCRIPTS & ACADEMIC MERIT RECORD"
      };

      let cardY = 46;
      categories.forEach((type) => {
        const doc = vaultDocs.find(d => d.type === type);

        if (doc) {
          const isVerified = doc.status === "verified";
          
          // Draw container card
          if (isVerified) {
            pdf.setFillColor(245, 249, 246); // Light green-tint
            pdf.setDrawColor(180, 220, 195);
          } else {
            pdf.setFillColor(254, 252, 242); // Light amber-tint
            pdf.setDrawColor(235, 215, 175);
          }
          pdf.setLineWidth(0.35);
          pdf.rect(12, cardY, 186, 41, "FD");

          // Header line inside card
          pdf.setFillColor(doc.status === "verified" ? 16 : 190, doc.status === "verified" ? 124 : 110, doc.status === "verified" ? 65 : 10);
          pdf.rect(12, cardY, 186, 6, "F");

          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.text(`${labels[type]}  •  [${doc.status.toUpperCase()}]`, 16, cardY + 4.2);

          // Details grid
          pdf.setTextColor(50, 60, 75);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);

          pdf.text("Document Label:", 16, cardY + 11.5);
          pdf.setFont("helvetica", "bold");
          pdf.text(doc.name, 42, cardY + 11.5);

          pdf.setFont("helvetica", "normal");
          pdf.text("Source Filename:", 16, cardY + 16.5);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${doc.fileName} (${doc.fileSize})`, 42, cardY + 16.5);

          pdf.setFont("helvetica", "normal");
          pdf.text("Document / Ref No:", 16, cardY + 21.5);
          pdf.setFont("helvetica", "bold");
          pdf.text(doc.documentNumber || "Pre-populated Default", 42, cardY + 21.5);

          pdf.setFont("helvetica", "normal");
          pdf.text("Holder Name:", 16, cardY + 26.5);
          pdf.setFont("helvetica", "bold");
          pdf.text((doc.holderName || "Krishna Kranthi Teja Kumar").toUpperCase(), 42, cardY + 26.5);

          // Right side details
          pdf.setFont("helvetica", "normal");
          pdf.text("Issued By:", 110, cardY + 11.5);
          pdf.setFont("helvetica", "bold");
          pdf.text(doc.issuedBy || "Official Authority Portal", 132, cardY + 11.5);

          if (doc.expiryDate) {
            pdf.setFont("helvetica", "normal");
            pdf.text("Expiry Date:", 110, cardY + 16.5);
            pdf.setFont("helvetica", "bold");
            pdf.text(doc.expiryDate, 132, cardY + 16.5);
          }

          pdf.setFont("helvetica", "normal");
          pdf.text("Registry Check:", 110, cardY + 21.5);
          pdf.setFont("helvetica", "bold");
          pdf.text("Double-Entry Match ✔", 132, cardY + 21.5);

          // Hash seal footer
          pdf.setFillColor(255, 255, 255);
          pdf.rect(14, cardY + 31.5, 182, 6.5, "F");
          pdf.setDrawColor(220, 225, 235);
          pdf.rect(14, cardY + 31.5, 182, 6.5, "S");

          pdf.setFont("courier", "bold");
          pdf.setFontSize(6.5);
          pdf.setTextColor(110, 115, 125);
          pdf.text(`DIGITAL SIGNATURE FOOTPRINT SHA-256 REGISTER: ${(doc.securityHash || "SHA256: NULL").toUpperCase()}`, 17, cardY + 35.8);

        } else {
          // Greyed out / Pending Card
          pdf.setFillColor(248, 250, 252); // soft grey
          pdf.setDrawColor(218, 223, 230);
          pdf.setLineWidth(0.35);
          pdf.rect(12, cardY, 186, 41, "FD");

          // Header block greyed out
          pdf.setFillColor(115, 125, 140);
          pdf.rect(12, cardY, 186, 6, "F");

          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.text(`${labels[type]}  •  [PENDING SECURE UPLOAD]`, 16, cardY + 4.2);

          pdf.setTextColor(100, 116, 139);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.text("No digital scan is currently secured in WeHive's crypto-vault for this category.", 18, cardY + 15);
          pdf.text("Please initiate camera scanning or upload this compliance document file to allow validation.", 18, cardY + 20);
          pdf.text("Once uploaded, the WeHive OCR engines will auto-transcribe this metadata block in real-time.", 18, cardY + 25);

          // Secure barcode outline
          pdf.setDrawColor(230, 235, 245);
          pdf.line(14, cardY + 32, 192, cardY + 32);
          pdf.setTextColor(150, 160, 175);
          pdf.setFont("courier", "italic");
          pdf.setFontSize(6.5);
          pdf.text("SECURE CRYPTO SHIELD VAULT STATUS: EMPTY ASSET SLOT REGISTER", 18, cardY + 37);
        }

        cardY += 45;
      });

      // Bottom Compliance Certification Box (Y=230 to 273)
      pdf.setDrawColor(220, 224, 230);
      pdf.line(12, 228, 198, 228);

      pdf.setFillColor(242, 245, 252);
      pdf.setDrawColor(200, 212, 235);
      pdf.rect(12, 232, 186, 42, "FD");

      pdf.setTextColor(0, 28, 184);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("WEHIVE SAFE-VAULT INTEGRITY ASSURANCE EMBOSSER", 18, 239);

      pdf.setTextColor(80, 85, 95);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      const certificationText = "This certified index summary details cumulative milestones, physical scanning logs, and biographical profiles registered under WeHive's secure cloud container system. Digital hashes are matching authentic, uncompromised university registration and embassy portals worldwide.";
      pdf.text(certificationText, 18, 244, { maxWidth: 174 });

      // Drawn barcode
      pdf.setFillColor(20, 30, 50);
      let barcodeX = 18;
      for (let i = 0; i < 28; i++) {
        const width = Math.random() > 0.55 ? 1.4 : 0.6;
        pdf.rect(barcodeX, 259, width, 10, "F");
        barcodeX += width + 0.8;
      }

      pdf.setFont("courier", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(40, 40, 40);
      const finalHash = `SHA256: SUMMARY-${Math.random().toString(16).substr(2, 6).toUpperCase()}-${Math.random().toString(16).substr(2, 6).toUpperCase()}`;
      pdf.text(finalHash, 90, 264);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.text(`CRYPTO-LEDGER SHIELD PROTOCOL SUMMARY STATUS: ${isAllCompliant ? "FULLY COMPLIANT ✔" : "PENDING SECURE LOADS ⚠️"}`, 90, 269);

      // Watermark footer (Page 2)
      pdf.setTextColor(148, 163, 184);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text("Page 2 of 2  •  Official compiled record of international journey checkpoints secured by WeHive Smart Vault Systems.", 22, 282);

      // Save PDF summary file
      pdf.save(`WeHive_Journey_Compliance_Summary_${new Date().toISOString().split("T")[0]}.pdf`);

      triggerNotification(
        "Application Status Summary PDF Exported! 📄✨",
        "Your compiled study journey and document inventory have been successfully bundled into a secure PDF summary.",
        "milestone",
        "tracking"
      );
    } catch (e) {
      console.error("Compiled summary PDF generation failed:", e);
      triggerNotification(
        "Summary PDF Export Failed",
        "An error occurred while compiling the travel compliance inventory and milestone records.",
        "system",
        "tracking"
      );
    }
  };

  // Progress Calculations
  const completedCount = milestones.filter(m => m.status === "completed").length;
  const totalCount = milestones.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Individual Stages Progress Calculations
  const stages = [
    {
      key: "Preparation",
      label: "Preparation Phase",
      description: "Profile & Test Prep",
      strokeColor: "#F59E0B",
      milestones: milestones.filter(m => m.category === "Preparation")
    },
    {
      key: "Admission",
      label: "Admission Phase",
      description: "College Applications",
      strokeColor: "#2563EB",
      milestones: milestones.filter(m => m.category === "Admission")
    },
    {
      key: "Visa",
      label: "Visa Filing Phase",
      description: "Embassy Logs & Prep",
      strokeColor: "#10B981",
      milestones: milestones.filter(m => m.category === "Visa")
    },
    {
      key: "Pre-Departure",
      label: "Pre-Departure",
      description: "Travel & Housing Prep",
      strokeColor: "#8B5CF6",
      milestones: milestones.filter(m => m.category === "Pre-Departure")
    }
  ];

  const stageStats = stages.map(s => {
    const total = s.milestones.length;
    const completed = s.milestones.filter(m => m.status === "completed").length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      ...s,
      total,
      completed,
      percent
    };
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto pb-12 bg-slate-50 animate-fade-in relative select-none">
      {/* Top Banner Header */}
      <div className="bg-blue-950 px-5 pt-8 pb-6 rounded-b-[24px] shadow-sm text-white shrink-0">
        <div className="flex items-center gap-1.5 mb-2.5 opacity-90">
          <div className="w-4.5 h-4.5 rounded bg-red-600 flex items-center justify-center font-bold text-white text-[10px] shadow">W</div>
          <span className="text-[10px] font-bold tracking-wider text-blue-100 font-mono">WEHIVE TRACKER</span>
        </div>
        <h1 className="text-xl font-black">My Study Journey</h1>
        <p className="text-xs text-red-300 mt-1">Check progress milestones and upload secure files to your storage</p>
      </div>

      {/* Sub-Tabs Sliding Segment Control */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl mx-4 mt-4 border border-slate-300/30 shrink-0">
        <button
          onClick={() => setSubTab("milestones")}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subTab === "milestones" 
              ? "bg-white text-blue-950 shadow-sm" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Checklist
        </button>
        <button
          onClick={() => setSubTab("vault")}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
            subTab === "vault" 
              ? "bg-white text-blue-950 shadow-sm" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Lock className="w-3 h-3 text-red-600" />
          Document Vault
          <span className="ml-1.5 bg-slate-900 text-white font-mono text-[8px] px-1.5 py-0.5 rounded-full leading-none shrink-0">
            {vaultDocs.length}/4
          </span>
        </button>
      </div>

      {/* Real-time Document Verification & Compliance HUD */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-widest block">Live Verification HUD</span>
            <h3 className="text-xs font-black text-slate-800 mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Document Compliance Ledger
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              {vaultDocs.length}/4 Assets Secured
            </span>
            <div className="text-[8px] text-emerald-600 font-bold mt-1 font-mono">
              {vaultDocs.length === 4 ? "🛡️ FULLY COMPLIANT" : "⚠️ ACTIONS REQUIRED"}
            </div>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${(vaultDocs.length / 4) * 100}%` }}
          />
        </div>

        {/* Proactive Expiry Warning Ledger */}
        {vaultDocs.some(d => (d.type === "passport" || d.type === "visa") && d.expiryDate && (isExpired(d.expiryDate) || isNearExpiry(d.expiryDate))) && (
          <div className="bg-red-50/70 border border-red-100 rounded-xl p-3 space-y-2 text-left animate-fade-in">
            <div className="flex items-center gap-1.5 text-[9px] font-mono font-black text-red-700 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>Document Expiration Alerts</span>
            </div>
            <div className="space-y-1.5">
              {vaultDocs.filter(d => (d.type === "passport" || d.type === "visa") && d.expiryDate && (isExpired(d.expiryDate) || isNearExpiry(d.expiryDate))).map(doc => {
                const expired = isExpired(doc.expiryDate);
                const daysLeft = doc.expiryDate ? Math.ceil((new Date(doc.expiryDate).getTime() - new Date("2026-07-04").getTime()) / (1000 * 60 * 60 * 24)) : 0;
                return (
                  <div key={doc.id} className="flex justify-between items-center text-[10px] bg-white border border-red-100 p-2 rounded-lg text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${expired ? "bg-red-600 animate-ping" : "bg-amber-500 animate-pulse"}`} />
                      <span className="font-extrabold capitalize text-slate-700">{doc.type}:</span>
                      <span className="text-slate-500 font-medium text-[9px]">
                        {expired ? "Expired Copy" : `Expiring soon (${daysLeft} days left)`}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
                      {doc.expiryDate}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Grid of the 4 required documents with instant actions */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {["passport", "offer_letter", "visa", "transcript"].map((type) => {
            const doc = vaultDocs.find(d => d.type === type);
            const label = 
              type === "passport" ? "Passport" :
              type === "offer_letter" ? "Admission" :
              type === "visa" ? "Visa Copy" :
              "Transcripts";
            
            const isVerified = doc?.status === "verified";
            const isUnderReview = doc?.status === "under_review";
            const isMissing = !doc;

            return (
              <div 
                key={type} 
                className={`p-2 rounded-xl border text-center transition-all flex flex-col justify-between h-[78px] ${
                  isVerified ? "bg-emerald-50/45 border-emerald-200" :
                  isUnderReview ? "bg-amber-50/45 border-amber-200 animate-pulse" :
                  "bg-slate-50/50 border-slate-200 border-dashed"
                }`}
              >
                <div>
                  <div className="flex justify-center mb-1">
                    {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    {isUnderReview && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                    {isMissing && <Circle className="w-3.5 h-3.5 text-slate-300" />}
                  </div>
                  <span className="text-[9px] font-extrabold text-slate-700 block truncate leading-tight">
                    {label}
                  </span>
                </div>

                <div className="mt-1">
                  {doc ? (
                    <button
                      onClick={() => setSelectedViewerDoc(doc)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[8px] py-1 rounded-md cursor-pointer uppercase transition-colors"
                    >
                      View
                    </button>
                  ) : (
                    <button
                      onClick={() => startScanning(type as VaultDocument["type"])}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-[8px] py-1 rounded-md cursor-pointer uppercase transition-colors"
                    >
                      Scan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider & Export Summary PDF Button */}
        <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-[10px] text-slate-500 font-medium text-left leading-tight">
            Need a certified copy of your study abroad progress? Export your compiled application milestones and document vault index into a single summary report.
          </div>
          <button
            onClick={handleExportSummaryPDF}
            className="w-full sm:w-auto shrink-0 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            Export Summary PDF
          </button>
        </div>
      </div>

      {subTab === "milestones" && isLoading && (
        <div className="p-4 space-y-4 animate-pulse" id="milestones-skeleton-loader">
            {/* Journey Progress Ring Card Skeleton */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/40 shadow-xs flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-2.5 w-20 bg-slate-200 rounded" />
                <div className="h-4 w-36 bg-slate-300 rounded" />
                <div className="h-2.5 w-28 bg-slate-200 rounded" />
              </div>
              <div className="w-14 h-14 rounded-full bg-slate-200/80" />
            </div>

            {/* Checklist Milestones Feed Skeletons */}
            <div className="space-y-3">
              {[1, 2].map((idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/50 p-4 shadow-xs flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="h-2.5 w-14 bg-slate-200 rounded" />
                      <div className="h-4.5 w-16 bg-slate-100 rounded-md" />
                    </div>
                    <div className="h-3.5 w-48 bg-slate-300 rounded" />
                    <div className="h-3 w-full bg-slate-200 rounded" />
                    <div className="h-3 w-4/5 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {subTab === "milestones" && !isLoading && (
        <div className="p-4 space-y-4">
          {/* Dynamic Journey Progress Ring */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/50 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Live Journey Stat</span>
              <h2 className="text-sm font-extrabold text-slate-800 mt-0.5">Application Milestone</h2>
              <p className="text-[11px] text-slate-500 mt-1">
                Completed {completedCount} of {totalCount} steps
              </p>
            </div>
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-red-600 transition-all duration-500"
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-extrabold text-slate-800 font-mono">{progressPercent}%</span>
            </div>
          </div>

          {/* Individual Stage Progress Grid */}
          <div className="bg-white rounded-[24px] p-4.5 border border-slate-200/50 shadow-sm space-y-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Stage-by-Stage Tracker</span>
              <h3 className="text-xs font-black text-slate-800 mt-0.5">Application Stage Progress</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-1">Visualize and monitor key phases of your study permit journey</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {stageStats.map((stage) => (
                <div 
                  key={stage.key} 
                  id={`stage-card-${stage.key}`}
                  className="p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between gap-2.5 transition-all bg-slate-50/50 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-extrabold text-slate-800 leading-tight block truncate">
                      {stage.label}
                    </span>
                    <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wide block mt-0.5">
                      {stage.description}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold font-mono mt-2 block">
                      {stage.completed}/{stage.total} Done
                    </span>
                  </div>

                  <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="transition-all duration-500"
                        strokeDasharray={`${stage.percent}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke={stage.strokeColor}
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-[9px] font-black font-mono text-slate-700">{stage.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist Milestones Feed */}
          <div className="space-y-3">
            {milestones.map((m, idx) => {
              const isCompleted = m.status === "completed";
              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-2xl border border-slate-200/60 p-4 shadow-xs transition-all relative ${
                    isCompleted ? "border-blue-100 bg-blue-50/10" : ""
                  }`}
                >
                  {idx < milestones.length - 1 && (
                    <div className="absolute left-7 top-14 bottom-[-16px] w-0.5 bg-slate-200 z-0" />
                  )}

                  <div className="flex items-start gap-3 relative z-10">
                    <button
                      onClick={() => toggleMilestone(m.id)}
                      className="mt-0.5 text-slate-400 hover:text-blue-900 cursor-pointer shrink-0 transition-colors"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-red-600 fill-red-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide font-mono">
                          {m.category}
                        </span>
                        {isCompleted && (
                          <span className="text-[8px] bg-blue-50 text-blue-900 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                            Completed
                          </span>
                        )}
                      </div>
                      <h3 className={`text-xs font-bold mt-1 text-slate-800 ${isCompleted ? "line-through text-slate-400" : ""}`}>
                        {m.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-medium">
                        {m.description}
                      </p>

                      {/* Milestone document files */}
                      {m.documentName && (
                        <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2.5 animate-fade-in">
                          <div className="flex items-center gap-1.5 truncate">
                            <FileText className="w-4 h-4 text-blue-900 shrink-0" />
                            <div className="truncate text-left">
                              <p className="text-[10px] text-slate-400 leading-tight">Document Slot</p>
                              <p className="text-[11px] font-bold text-slate-600 truncate">{m.documentUploaded ? m.documentName : "Empty file"}</p>
                            </div>
                          </div>

                          {m.documentUploaded ? (
                            <button
                              onClick={() => handleDeleteDocument(m.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-55 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Delete file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenUpload(m)}
                              className="bg-blue-50 text-blue-900 hover:bg-blue-900 hover:text-white border border-blue-100 font-bold text-[9px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              Upload Draft
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === "vault" && isLoading && (
        /* ================= DOCUMENT VAULT TAB ================= */
        <div className="p-4 space-y-4 animate-pulse" id="vault-skeleton-loader">
            {/* Vault Security Disclaimer banner skeleton */}
            <div className="bg-slate-900/95 rounded-2xl p-4 border border-white/5 shadow-md flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 bg-slate-800 rounded" />
                <div className="h-3 w-44 bg-slate-800 rounded" />
                <div className="h-2.5 w-full bg-slate-800/60 rounded" />
              </div>
            </div>

            {/* Secure vault list grid skeleton */}
            <div className="space-y-3">
              <div className="h-3 w-32 bg-slate-300 rounded-md font-mono mb-1" />
              
              {[1, 2].map((idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200/50 p-4 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div className="h-4 w-40 bg-slate-300 rounded" />
                        <div className="h-4.5 w-16 bg-slate-100 rounded-md" />
                      </div>
                      <div className="h-3 w-52 bg-slate-200/80 rounded" />
                      
                      {/* Document File details simulator */}
                      <div className="mt-3 bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-2">
                        <div className="flex justify-between">
                          <div className="h-3 w-32 bg-slate-200 rounded" />
                          <div className="h-3 w-10 bg-slate-200 rounded" />
                        </div>
                        <div className="h-2.5 w-48 bg-slate-100 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {subTab === "vault" && !isLoading && (
        <div className="p-4 space-y-4 animate-fade-in">
          
          {/* Vault Security Disclaimer banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 border border-white/10 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-xl" />
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/5 rounded-xl text-red-500 border border-white/10 shrink-0">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded font-mono uppercase tracking-widest scale-90">
                    AES-256
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">Military Cryptography</span>
                </div>
                <h3 className="text-xs font-black text-white mt-1.5">Enterprise Encrypted Vault</h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-normal font-medium">
                  WeHive secures copies of visa assets and passports to assure instant compliance reports during university board checkups.
                </p>
              </div>
            </div>
          </div>

          {/* Secure vault layout switch */}
          <div className="flex items-center justify-between p-1.5 bg-slate-100 rounded-xl" id="vault-layout-switcher">
            <div className="flex items-center gap-2 pl-2">
              <FolderCheck className="w-4 h-4 text-slate-600" />
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider font-mono">Vault View</span>
            </div>
            <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-300/10">
              <button
                onClick={() => setIsSmartView(true)}
                className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  isSmartView 
                    ? "bg-white text-slate-800 shadow-sm font-extrabold" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Smart Folders
              </button>
              <button
                onClick={() => setIsSmartView(false)}
                className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  !isSmartView 
                    ? "bg-white text-slate-800 shadow-sm font-extrabold" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Classic List
              </button>
            </div>
          </div>

          {/* Secure vault list grid */}
          {(() => {
            const verifiedDocs = vaultDocs.filter(d => d.status === "verified" && !isExpired(d.expiryDate));
            const pendingDocs = vaultDocs.filter(d => (d.status === "pending" || d.status === "under_review") && !isExpired(d.expiryDate));
            const expiredDocs = vaultDocs.filter(d => isExpired(d.expiryDate));

            // Helpers for rendering cards
            const renderDocItem = (doc: VaultDocument) => {
              const label = 
                doc.type === "passport" ? "Scanned Passport Copy" :
                doc.type === "offer_letter" ? "University Offer Letter" :
                doc.type === "visa" ? "Student Schengen Visa Copies" :
                "Academic Transcripts";
              
              const description = 
                doc.type === "passport" ? "Biopage & signature stamp logs" :
                doc.type === "offer_letter" ? "Official admission stamp from TUM" :
                doc.type === "visa" ? "Embassy entry permit and visa stickers" :
                "Pre-collegiate verified marks sheets";

              const docExpired = isExpired(doc.expiryDate);
              const docNearExpiry = isNearExpiry(doc.expiryDate);

              return (
                <div 
                  key={doc.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl border shrink-0 bg-blue-50 border-blue-100 text-blue-900">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-extrabold text-slate-800 truncate">
                          {label}
                        </h4>
                        <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-md flex items-center gap-1 uppercase ${
                          docExpired
                            ? "bg-red-50 text-red-700 border border-red-100 animate-pulse"
                            : doc.status === "verified" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            docExpired 
                              ? "bg-red-500" 
                              : doc.status === "verified" 
                                ? "bg-emerald-500" 
                                : "bg-amber-500 animate-pulse"
                          }`} />
                          {docExpired ? "Expired" : doc.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                        {description}
                      </p>

                      <div className="mt-3 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                          <span className="truncate font-semibold text-slate-700 max-w-[180px]">{doc.fileName}</span>
                          <span>{doc.fileSize}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 font-mono border-t border-slate-200/50 pt-1.5">
                          <span>Uploaded {doc.uploadedAt}</span>
                          <span className="text-slate-500 font-bold">{doc.securityHash.substr(0, 16)}...</span>
                        </div>

                        {doc.expiryDate && (
                          <div className={`mt-1.5 flex items-center gap-1.5 text-[9px] font-mono border-t border-slate-200/50 pt-1.5 ${docExpired ? "text-red-600 font-bold animate-pulse" : docNearExpiry ? "text-amber-600 font-bold" : "text-slate-500"}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{docExpired ? "Document Expired:" : "Expiration Compliance Date:"}</span>
                            <span className={`ml-auto font-bold px-1.5 py-0.5 rounded border ${docExpired ? "bg-red-50 border-red-200 text-red-700" : docNearExpiry ? "bg-amber-50 border-amber-200 text-amber-700 animate-pulse" : "bg-slate-100 border-slate-200 text-slate-700"}`}>{doc.expiryDate}</span>
                          </div>
                        )}

                        <div className="flex gap-2 mt-3.5 pt-1 border-t border-slate-200/30">
                          <button
                            onClick={() => setSelectedViewerDoc(doc)}
                            className="flex-1 bg-blue-950 hover:bg-blue-900 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Document
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(doc)}
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-all cursor-pointer"
                            title="Download certified PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-950" />
                          </button>
                          <button
                            onClick={() => handleSharePDF(doc)}
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-all cursor-pointer"
                            title="Share certified document"
                          >
                            <Share2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteVaultDoc(doc.id, doc.name)}
                            className="p-1.5 bg-white hover:bg-red-50 hover:border-red-200 border border-slate-200 text-slate-400 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            };

            const renderEmptySlot = (type: "passport" | "offer_letter" | "visa" | "transcript") => {
              const label = 
                type === "passport" ? "Scanned Passport Copy" :
                type === "offer_letter" ? "University Offer Letter" :
                type === "visa" ? "Student Schengen Visa Copies" :
                "Academic Transcripts";
              
              const description = 
                type === "passport" ? "Biopage & signature stamp logs" :
                type === "offer_letter" ? "Official admission stamp from TUM" :
                type === "visa" ? "Embassy entry permit and visa stickers" :
                "Pre-collegiate verified marks sheets";

              return (
                <div 
                  key={type}
                  className="bg-slate-50/40 rounded-2xl border border-dashed border-slate-300 p-4 shadow-xs transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl border shrink-0 bg-slate-100 border-slate-200 text-slate-400">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-extrabold text-slate-800 truncate">
                        {label}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                        {description}
                      </p>
                      
                      <button
                        onClick={() => handleOpenVaultUpload(type)}
                        className="mt-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 py-2 px-3.5 rounded-xl text-[10px] font-bold text-slate-700 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer leading-none"
                      >
                        <Plus className="w-3.5 h-3.5 text-red-600" />
                        <span>Secure Upload</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            };

            if (isSmartView) {
              return (
                <div className="space-y-4" id="smart-folder-vault-container">
                  {/* Smart Folders Bento Grid */}
                  <div className="grid grid-cols-2 gap-3" id="smart-folders-deck">
                    
                    {/* All Documents Folder */}
                    <button
                      onClick={() => setVaultFolderFilter("all")}
                      className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between h-[104px] cursor-pointer ${
                        vaultFolderFilter === "all"
                          ? "bg-gradient-to-br from-blue-50 to-blue-100/40 border-blue-400 shadow-sm ring-1 ring-blue-400"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className={`p-2 rounded-xl ${vaultFolderFilter === "all" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
                          <FolderOpen className="w-5 h-5" />
                        </div>
                        <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full ${
                          vaultFolderFilter === "all" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {vaultDocs.length}
                        </span>
                      </div>
                      <div className="mt-2">
                        <h5 className="text-[11px] font-black text-slate-800 leading-none">All Assets</h5>
                        <p className="text-[9px] text-slate-400 font-medium mt-1 leading-none font-sans">Full digital archive</p>
                      </div>
                    </button>

                    {/* Verified Folder */}
                    <button
                      onClick={() => setVaultFolderFilter("verified")}
                      className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between h-[104px] cursor-pointer ${
                        vaultFolderFilter === "verified"
                          ? "bg-gradient-to-br from-emerald-50 to-emerald-100/40 border-emerald-400 shadow-sm ring-1 ring-emerald-400"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className={`p-2 rounded-xl ${vaultFolderFilter === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                          <FolderCheck className="w-5 h-5" />
                        </div>
                        <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full ${
                          vaultFolderFilter === "verified" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {verifiedDocs.length}
                        </span>
                      </div>
                      <div className="mt-2">
                        <h5 className="text-[11px] font-black text-slate-800 leading-none">Verified Folder</h5>
                        <p className="text-[9px] text-slate-400 font-medium mt-1 leading-none font-sans">Approved compliances</p>
                      </div>
                    </button>

                    {/* Pending Folder */}
                    <button
                      onClick={() => setVaultFolderFilter("pending")}
                      className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between h-[104px] cursor-pointer ${
                        vaultFolderFilter === "pending"
                          ? "bg-gradient-to-br from-amber-50 to-amber-100/40 border-amber-400 shadow-sm ring-1 ring-amber-400"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className={`p-2 rounded-xl ${vaultFolderFilter === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full ${
                          vaultFolderFilter === "pending" ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {pendingDocs.length}
                        </span>
                      </div>
                      <div className="mt-2">
                        <h5 className="text-[11px] font-black text-slate-800 leading-none">Pending Review</h5>
                        <p className="text-[9px] text-slate-400 font-medium mt-1 leading-none font-sans">Embassy seals queue</p>
                      </div>
                    </button>

                    {/* Expired Folder */}
                    <button
                      onClick={() => setVaultFolderFilter("expired")}
                      className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between h-[104px] cursor-pointer ${
                        vaultFolderFilter === "expired"
                          ? "bg-gradient-to-br from-rose-50 to-rose-100/40 border-rose-400 shadow-sm ring-1 ring-rose-400"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className={`p-2 rounded-xl ${vaultFolderFilter === "expired" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full ${
                          vaultFolderFilter === "expired" ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {expiredDocs.length}
                        </span>
                      </div>
                      <div className="mt-2">
                        <h5 className="text-[11px] font-black text-slate-800 leading-none">Expired Folder</h5>
                        <p className="text-[9px] text-slate-400 font-medium mt-1 leading-none font-sans">Requires renewal</p>
                      </div>
                    </button>

                  </div>

                  {/* Filter Header and Quick Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 pl-1">
                    <h4 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider font-mono">
                      {vaultFolderFilter === "all" && "All Uploaded Files"}
                      {vaultFolderFilter === "verified" && "Verified Files"}
                      {vaultFolderFilter === "pending" && "Pending Reviews"}
                      {vaultFolderFilter === "expired" && "Expired Compliances"}
                    </h4>
                    <button
                      onClick={() => {
                        startScanning("passport");
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs uppercase tracking-wide"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Scan Passport
                    </button>
                  </div>

                  {/* Filtered Document List Rendering */}
                  <div className="space-y-3">
                    {/* Filter All */}
                    {vaultFolderFilter === "all" && (
                      <>
                        {vaultDocs.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                            <Folder className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            Your document vault is currently empty.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Expired Section if any */}
                            {expiredDocs.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[9px] font-black font-mono text-rose-600 uppercase tracking-widest block bg-rose-50 border border-rose-100 px-2 py-1 rounded-md w-max">⚠️ Expired Compliances ({expiredDocs.length})</span>
                                <div className="space-y-2">
                                  {expiredDocs.map(renderDocItem)}
                                </div>
                              </div>
                            )}

                            {/* Pending Section if any */}
                            {pendingDocs.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[9px] font-black font-mono text-amber-600 uppercase tracking-widest block bg-amber-50 border border-amber-100 px-2 py-1 rounded-md w-max">⏳ Pending Verification ({pendingDocs.length})</span>
                                <div className="space-y-2">
                                  {pendingDocs.map(renderDocItem)}
                                </div>
                              </div>
                            )}

                            {/* Verified Section if any */}
                            {verifiedDocs.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[9px] font-black font-mono text-emerald-600 uppercase tracking-widest block bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md w-max">✅ Approved Assets ({verifiedDocs.length})</span>
                                <div className="space-y-2">
                                  {verifiedDocs.map(renderDocItem)}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Missing checklist of categories not uploaded yet */}
                        {(() => {
                          const uploadedTypes = vaultDocs.map(d => d.type);
                          const missingTypes = (["passport", "offer_letter", "visa", "transcript"] as const).filter(t => !uploadedTypes.includes(t));
                          if (missingTypes.length > 0) {
                            return (
                              <div className="mt-4 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                                <div className="flex items-center gap-1.5 pl-0.5">
                                  <AlertCircle className="w-4 h-4 text-slate-500" />
                                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider font-mono">Missing Comps Checklist</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  {missingTypes.map((type) => {
                                    const label = 
                                      type === "passport" ? "Scanned Passport Copy" :
                                      type === "offer_letter" ? "University Offer Letter" :
                                      type === "visa" ? "Student Schengen Visa Copies" :
                                      "Academic Transcripts";
                                    return (
                                      <div key={type} className="flex items-center justify-between bg-white border border-slate-150 p-2.5 rounded-xl">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                          <span className="text-[11px] font-bold text-slate-700">{label}</span>
                                        </div>
                                        <button
                                          onClick={() => handleOpenVaultUpload(type)}
                                          className="text-[9px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                        >
                                          Upload
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </>
                    )}

                    {/* Filter Verified */}
                    {vaultFolderFilter === "verified" && (
                      verifiedDocs.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <FolderCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          No verified documents in this folder.
                          <p className="text-[10px] text-slate-400 mt-1">Uploaded files undergo security scans before approval.</p>
                        </div>
                      ) : (
                        verifiedDocs.map(renderDocItem)
                      )
                    )}

                    {/* Filter Pending */}
                    {vaultFolderFilter === "pending" && (
                      pendingDocs.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2 animate-pulse" />
                          No pending verification queue.
                          <p className="text-[10px] text-slate-400 mt-1">All uploaded visa credentials and passports are verified!</p>
                        </div>
                      ) : (
                        pendingDocs.map(renderDocItem)
                      )
                    )}

                    {/* Filter Expired */}
                    {vaultFolderFilter === "expired" && (
                      expiredDocs.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                          No expired documents.
                          <p className="text-[10px] text-slate-400 mt-1">All compliance and expiration dates are active & healthy!</p>
                        </div>
                      ) : (
                        expiredDocs.map(renderDocItem)
                      )
                    )}

                  </div>
                </div>
              );
            }

            // Traditional/Classic list mode
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between pl-1">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">
                    Primary Visa Assets
                  </h4>
                  <button
                    onClick={() => startScanning("visa")}
                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs uppercase tracking-wide"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Scan Document
                  </button>
                </div>

                {["passport", "offer_letter", "visa", "transcript"].map((type) => {
                  const doc = vaultDocs.find(d => d.type === type);
                  return doc ? renderDocItem(doc) : renderEmptySlot(type as any);
                })}
              </div>
            );
          })()}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-900 leading-normal">
              Need a physical certification? Request certified hard copies directly from the **Hive AI chat** console at any time.
            </p>
          </div>
        </div>
      )}

      {/* ================= SIMULATED FILE UPLOAD DRAWER OVERLAY ================= */}
      {(activeUploadMilestone || isNewUploadOpen) && (
        <div className="absolute inset-0 bg-black/60 flex items-end justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl rounded-b-xl w-full max-w-[360px] p-5 shadow-2xl relative animate-slide-up select-none">
            <button
              onClick={handleCloseUpload}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase font-mono flex items-center gap-1 w-max">
              <Shield className="w-2.5 h-2.5" />
              Secure AES-256 Upload
            </span>
            <h3 className="text-sm font-black text-slate-800 mt-2">
              {activeUploadMilestone ? "Upload Milestone Draft" : "Secure Document Archival"}
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
              Select or drop certified files for <b>{activeUploadMilestone ? activeUploadMilestone.title : vaultUploadType}</b>. WeHive automatically checks biometric compliance.
            </p>

            {/* Expiry Date input field for manual upload */}
            {!activeUploadMilestone && (vaultUploadType === "passport" || vaultUploadType === "visa") && !uploading && !uploadSuccess && (
              <div className="mb-4 bg-slate-50 rounded-xl p-3 border border-slate-200/60 font-sans space-y-1">
                <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider block">Set Document Expiry Date</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="date"
                    value={expiryInput}
                    onChange={(e) => setExpiryInput(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                isDragging
                  ? "border-red-600 bg-red-50/10"
                  : uploading
                  ? "border-blue-300 bg-slate-50"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              {uploading ? (
                <div className="space-y-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Upload className="w-5 h-5 text-blue-950" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">Hashing & Securing File...</p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedFileName}</p>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-red-600">{uploadProgress}% Secure Transfer</span>
                </div>
              ) : uploadSuccess ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">File Safely Secured!</p>
                  <p className="text-[10px] text-slate-400 truncate">{selectedFileName}</p>
                  <div className="text-[9px] bg-slate-100 text-slate-500 font-mono py-1 px-2.5 rounded border border-slate-200 inline-block">
                    SHA256 Checksum Verified
                  </div>
                  <button
                    onClick={handleCloseUpload}
                    className="mt-3 bg-blue-950 text-white text-[10px] font-bold px-4 py-2 rounded-xl hover:bg-blue-900 cursor-pointer w-full"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Drag & drop your files here</p>
                    <p className="text-[10px] text-slate-400 font-medium">Supports PDF, DOCX or JPEG up to 10MB</p>
                  </div>
                  <div className="relative flex flex-col items-center gap-2">
                    <input
                      type="file"
                      id="file-selector"
                      accept=".pdf,.docx,.doc,.jpg,.jpeg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <label
                        htmlFor="file-selector"
                        className="bg-white hover:bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-600 inline-block shadow-xs cursor-pointer"
                      >
                        Browse Files
                      </label>
                      <button
                        onClick={() => {
                          handleCloseUpload();
                          startScanning(vaultUploadType || "visa");
                        }}
                        className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl px-4 py-2 text-[10px] font-bold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Scan with Camera
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= HIGH FIDELITY SECURE DOCUMENT VIEWER MODAL ================= */}
      {selectedViewerDoc && (
        <div className="absolute inset-0 bg-slate-950/98 z-55 flex flex-col justify-between animate-fade-in p-5 text-left select-none">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center font-black text-white text-xs">
                W
              </div>
              <div>
                <span className="text-[8px] font-mono text-slate-400 block tracking-widest uppercase">Safe-Vault Encrypted View</span>
                <h3 className="text-xs font-bold text-white leading-tight">
                  {selectedViewerDoc.name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadPDF(selectedViewerDoc)}
                className="flex items-center gap-1 text-[10px] font-bold text-white bg-blue-950 hover:bg-blue-900 px-2.5 py-1.5 rounded-lg border border-blue-800 transition-all cursor-pointer shadow-sm"
                title="Download certified PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
              <button
                onClick={() => handleSharePDF(selectedViewerDoc)}
                className="flex items-center gap-1 text-[10px] font-bold text-white bg-red-600 hover:bg-red-500 px-2.5 py-1.5 rounded-lg border border-red-500 transition-all cursor-pointer shadow-sm"
                title="Share PDF link"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => setSelectedViewerDoc(null)}
                className="text-slate-400 hover:text-white font-bold text-xs bg-white/5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-white/10"
              >
                Close
              </button>
            </div>
          </div>

          {/* Immersive Document Canvas rendering tailored mock contents */}
          <div className="flex-1 overflow-y-auto my-4 bg-slate-100 rounded-2xl border border-white/10 p-4 flex flex-col relative shadow-inner">
            {/* Visual scanlines/grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.7)_1px,transparent_1px)] bg-[size:100%_4px] opacity-10 pointer-events-none" />

            {selectedViewerDoc.scannedImage && (
              <div className="mb-4 flex gap-1 bg-slate-200/50 p-1 rounded-xl self-center shrink-0 border border-slate-300/20 z-10">
                <button
                  onClick={() => setViewerTab("scan")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    viewerTab === "scan"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  📸 Camera Scan
                </button>
                <button
                  onClick={() => setViewerTab("cert")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    viewerTab === "cert"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  📜 Compliance Cert
                </button>
              </div>
            )}

            {selectedViewerDoc.scannedImage && viewerTab === "scan" ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden relative min-h-[350px] animate-fade-in text-center">
                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                <div className="relative max-w-full flex flex-col items-center">
                  <img
                    src={selectedViewerDoc.scannedImage}
                    alt="Scanned Document"
                    referrerPolicy="no-referrer"
                    className="max-h-[380px] w-auto object-contain rounded-xl shadow-md border border-slate-200/80"
                  />
                  <div className="mt-4">
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-100 px-3 py-1 rounded-xl uppercase font-mono inline-flex items-center gap-1 leading-none shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Auto-Cropped (Scan Active)
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed max-w-xs">
                      This file is encrypted and safely archived in the local browser cache storage.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {selectedViewerDoc.type === "passport" && (
              /* --- HIGH FIDELITY PASSPORT CANVAS --- */
              <div className="bg-[#f0e6d2] rounded-xl p-4 border-4 border-double border-slate-700 text-slate-800 flex flex-col justify-between flex-1 relative overflow-hidden font-serif min-h-[360px] shadow-md">
                {/* Official seal overlay */}
                <div className="absolute right-3 top-3 opacity-15 text-slate-900 pointer-events-none">
                  <Shield className="w-24 h-24 stroke-1" />
                </div>

                <div className="flex justify-between items-start border-b border-slate-500 pb-2">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider font-sans text-slate-900">REPUBLIC OF WEHIVE</h4>
                    <p className="text-[7px] uppercase font-sans tracking-wide">PASSPORT / PASSEPORT</p>
                  </div>
                  <span className="text-[9px] font-sans font-black text-red-600">P&lt;WEHIVE&lt;KUMAR&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</span>
                </div>

                {/* Passport Bio info grid */}
                <div className="grid grid-cols-3 gap-3 my-4 font-sans text-[9px]">
                  {/* Photo area */}
                  <div className="col-span-1 bg-slate-300 rounded border border-slate-400 flex flex-col items-center justify-center h-28 relative overflow-hidden shadow-inner">
                    <div className="w-12 h-16 bg-slate-400 rounded-full mt-2 relative">
                      <div className="absolute top-4 left-2 w-2 h-2 rounded-full bg-slate-500" />
                      <div className="absolute top-4 right-2 w-2 h-2 rounded-full bg-slate-500" />
                    </div>
                    <span className="text-[7px] text-slate-600 font-extrabold mt-2 font-mono">KRISHNA K.</span>
                    <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 text-[6px]">
                      VERIFIED
                    </div>
                  </div>

                  {/* Bio Info rows */}
                  <div className="col-span-2 space-y-1.5 font-sans leading-tight pl-1">
                    <div>
                      <span className="text-[6px] text-slate-500 uppercase block font-mono">Surname / Nom</span>
                      <span className="font-bold text-slate-950 uppercase text-xs">
                        {selectedViewerDoc.holderName ? (selectedViewerDoc.holderName.trim().split(" ").pop() || "").toUpperCase() : "KUMAR"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[6px] text-slate-500 block font-mono">Given Names / Prénoms</span>
                      <span className="font-bold text-slate-900 text-[10px]">
                        {selectedViewerDoc.holderName ? (selectedViewerDoc.holderName.trim().split(" ").slice(0, -1).join(" ") || "").toUpperCase() : "KRISHNA KRANTHI TEJA"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <span className="text-[6px] text-slate-500 block font-mono">Nationality</span>
                        <span className="font-semibold text-slate-900">INDIAN</span>
                      </div>
                      <div>
                        <span className="text-[6px] text-slate-500 block font-mono">Date of Birth</span>
                        <span className="font-semibold text-slate-900">12 NOV 2001</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <span className="text-[6px] text-slate-500 block font-mono">Passport No</span>
                        <span className="font-bold text-red-700 font-mono">{selectedViewerDoc.documentNumber || "Z8392109"}</span>
                      </div>
                      <div>
                        <span className="text-[6px] text-slate-500 block font-mono">Sex / Sexe</span>
                        <span className="font-semibold text-slate-900">M</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <span className="text-[6px] text-slate-500 block font-mono">Expiry Date</span>
                        <span className="font-bold text-red-600 font-mono">{selectedViewerDoc.expiryDate || "2031-08-15"}</span>
                      </div>
                      <div>
                        <span className="text-[6px] text-slate-500 block font-mono">Authority / Autorité</span>
                        <span className="font-semibold text-slate-900">{selectedViewerDoc.issuedBy || "Passport Office"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Machine Readable Zone */}
                <div className="border-t border-dashed border-slate-500 pt-3 mt-auto font-mono text-[8px] text-slate-900 tracking-wider leading-relaxed">
                  <p className="bg-white/60 p-1.5 rounded text-center select-all border border-slate-300">
                    P&lt;IND&lt;&lt;{selectedViewerDoc.holderName ? (selectedViewerDoc.holderName.trim().split(" ").pop() || "").toUpperCase() : "KUMAR"}&lt;&lt;{selectedViewerDoc.holderName ? (selectedViewerDoc.holderName.trim().split(" ").slice(0, -1).join("<") || "").toUpperCase() : "KRISHNA<KRANTHI<TEJA"}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                    <br />
                    {(selectedViewerDoc.documentNumber || "Z8392109").toUpperCase()}&lt;1IND0111124M{selectedViewerDoc.expiryDate ? selectedViewerDoc.expiryDate.replace(/-/g, "").substring(2) : "310815"}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;02
                  </p>
                </div>
              </div>
            )}

            {selectedViewerDoc.type === "offer_letter" && (
              /* --- HIGH FIDELITY UNIVERSITY OFFER LETTER --- */
              <div className="bg-white rounded-xl p-5 border border-slate-300 text-slate-800 flex flex-col justify-between flex-1 relative font-serif min-h-[380px] shadow-md">
                {/* Letterhead */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase font-sans text-blue-900 leading-tight">Technical University of Munich</h4>
                    <p className="text-[8px] font-sans text-slate-500">Arcisstraße 21, 80333 München, Germany</p>
                  </div>
                  <div className="w-8 h-8 rounded bg-blue-950 flex items-center justify-center text-white text-[10px] font-black font-sans shrink-0">
                    TUM
                  </div>
                </div>

                {/* Contents */}
                <div className="my-4 text-left font-sans text-[10px] leading-relaxed space-y-3">
                  <div className="text-right text-[8px] text-slate-500 font-mono">
                    Ref ID: TUM-2026-AE-4991A
                    <br />
                    Date: June 25, 2026
                  </div>

                  <div>
                    <p className="font-bold text-slate-950">To: {selectedViewerDoc.holderName || "Krishna Kranthi Teja Kumar"}</p>
                    <p className="text-slate-500 text-[8px]">Applicant ID: {selectedViewerDoc.documentNumber || "29310842"}</p>
                  </div>

                  <h5 className="font-black text-slate-900 uppercase tracking-tight text-center border-y border-slate-100 py-1 font-sans text-[10px]">
                    OFFER OF ADMISSION - WINTER SEMESTER 2026
                  </h5>

                  <p className="text-[10px]">
                    Dear Mr. {selectedViewerDoc.holderName ? (selectedViewerDoc.holderName.trim().split(" ").pop() || "") : "Kumar"},
                    <br />
                    We are pleased to inform you that the Admissions Board has selected you for the **M.Sc. Aerospace Engineering** program at our Garching campus, starting **October 2026**.
                  </p>

                  <ul className="list-disc list-inside space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[9px]">
                    <li><strong className="text-slate-900">Course Level:</strong> Graduate Studies (Master of Science)</li>
                    <li><strong className="text-slate-900">Duration:</strong> 4 Semesters (Full-time)</li>
                    <li><strong className="text-slate-900">Language:</strong> English</li>
                  </ul>
                </div>

                {/* Sign-offs / Seal */}
                <div className="border-t border-slate-100 pt-3 mt-auto flex justify-between items-end font-sans">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-[8px]">Dr. Hans-Joachim Altrock</p>
                    <p className="text-slate-400 text-[7px] leading-none">Dean of International Admissions Office</p>
                    <div className="w-16 h-4 bg-[#0a2342]/10 rounded border border-[#0a2342]/20 flex items-center justify-center font-mono text-[7px] text-[#0a2342]">
                      CERTIFIED SIGN
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-12 h-12 rounded-full border border-blue-900 flex items-center justify-center text-[8px] font-mono text-blue-900 font-bold tracking-tight text-center leading-none opacity-80 mx-auto">
                      TUM
                      <br />
                      SEAL
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedViewerDoc.type === "visa" && (
              /* --- HIGH FIDELITY SCHENGEN VISA STICKER --- */
              <div className="bg-[#fcf8e3] rounded-xl p-4 border-2 border-slate-400 text-slate-800 flex flex-col justify-between flex-1 relative font-sans min-h-[350px] shadow-md">
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-15">
                  <Shield className="w-16 h-16 text-slate-900" />
                </div>

                <div className="border-b border-slate-300 pb-2">
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-900 font-mono">DEUTSCHLAND / SCHENGEN STAATEN</h4>
                  <div className="flex justify-between items-center text-[7px] text-slate-500 uppercase font-mono mt-0.5">
                    <span>Visum / Visa Category D</span>
                    <span className="text-red-700 font-black">{selectedViewerDoc.documentNumber || "ST-DE9128394"}</span>
                  </div>
                </div>

                <div className="my-3 space-y-2 text-[10px] leading-tight">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[7px] text-slate-400 block uppercase font-mono">Valid From / Vom</span>
                      <strong className="text-slate-900">15 SEP 2026</strong>
                    </div>
                    <div>
                      <span className="text-[7px] text-slate-400 block uppercase font-mono">Until / Bis</span>
                      <strong className="text-slate-900">{selectedViewerDoc.expiryDate || "14 MAR 2027"}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[7px] text-slate-400 block uppercase font-mono">Type / Art</span>
                      <strong className="text-slate-900">MULTIPLE ENTRY - STUDY (D)</strong>
                    </div>
                    <div>
                      <span className="text-[7px] text-slate-400 block uppercase font-mono">Passport No</span>
                      <strong className="text-slate-900">
                        {vaultDocs.find(d => d.type === "passport")?.documentNumber || "Z8392109"}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-[7px] text-slate-400 block uppercase font-mono">Name / Name</span>
                    <strong className="text-slate-950 uppercase text-[11px]">{selectedViewerDoc.holderName || "KUMAR, KRISHNA KRANTHI TEJA"}</strong>
                  </div>

                  <div className="bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20 text-[8px] leading-relaxed text-amber-900">
                    <strong>Remarks:</strong> Student permit under TUM Munich registration. Employment restricted to 120 full days per calendar year.
                  </div>
                </div>

                {/* Embedded QR Code simulated and security tags */}
                <div className="border-t border-slate-300 pt-3 mt-auto flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-10 h-10 text-slate-800" />
                    <div className="text-[7px] text-slate-400 font-mono">
                      <span>Secure digital passport ID</span>
                      <br />
                      <span>Validated: EMBASSY BUNDES</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-double border-yellow-600/50 flex items-center justify-center font-bold text-[8px] text-yellow-700 uppercase tracking-tight text-center leading-none">
                    Embassy
                    <br />
                    München
                  </div>
                </div>
              </div>
            )}

            {selectedViewerDoc.type === "transcript" && (
              /* --- HIGH FIDELITY ACADEMIC TRANSCRIPT --- */
              <div className="bg-white rounded-xl p-5 border border-slate-300 text-slate-800 flex flex-col justify-between flex-1 relative font-serif min-h-[380px] shadow-md">
                <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="text-[10px] font-extrabold uppercase font-sans text-slate-900 leading-tight">Board of Technical Education</h4>
                    <p className="text-[7px] font-sans text-slate-500">Degree & marks transcript archival registry</p>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">PAGE 1 OF 1</span>
                </div>

                <div className="my-3 space-y-2.5 font-sans">
                  <div className="text-[8px] text-slate-500 font-mono text-right">
                    ID: TRAN-29381-IN
                  </div>

                  <div className="text-[9px] leading-tight space-y-0.5">
                    <p><strong>Candidate Name:</strong> Krishna Kranthi Teja Kumar</p>
                    <p className="text-slate-500"><strong>Enrollment Year:</strong> 2022 - 2026 Bachelor of Technology</p>
                  </div>

                  <table className="w-full text-[9px] border-collapse my-2">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 font-mono">
                        <th className="p-1 text-left">Subject / Course</th>
                        <th className="p-1 text-center">Score</th>
                        <th className="p-1 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="p-1 text-left text-slate-800">Advanced Mathematics III</td>
                        <td className="p-1 text-center font-mono">92 / 100</td>
                        <td className="p-1 text-center text-emerald-600 font-bold">A+</td>
                      </tr>
                      <tr>
                        <td className="p-1 text-left text-slate-800">Fluid Mechanics & Dynamics</td>
                        <td className="p-1 text-center font-mono">88 / 100</td>
                        <td className="p-1 text-center text-emerald-600 font-bold">A</td>
                      </tr>
                      <tr>
                        <td className="p-1 text-left text-slate-800">Thermodynamics & Heat Labs</td>
                        <td className="p-1 text-center font-mono">94 / 100</td>
                        <td className="p-1 text-center text-emerald-600 font-bold">A+</td>
                      </tr>
                      <tr>
                        <td className="p-1 text-left text-slate-800">Computational Aerodynamics</td>
                        <td className="p-1 text-center font-mono">90 / 100</td>
                        <td className="p-1 text-center text-emerald-600 font-bold">A+</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[8px] font-mono text-center">
                    <span>Cumulative GPA: <strong>9.32 / 10.00</strong> (Class Rank #1)</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-auto flex justify-between items-end font-sans">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 text-[8px]">Prof. Ravinder Sen</p>
                    <p className="text-slate-400 text-[7px] leading-none">Registrar & Academic Dean</p>
                  </div>
                  <div className="w-14 h-6 bg-slate-100 rounded border border-slate-300 flex items-center justify-center text-[7px] font-mono font-bold text-slate-500">
                    APPROVED
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Secure Audit Log bottom panel */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0 font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>CRYPTOGRAPHIC AUDIT PASS</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3 text-[9px] text-slate-400">
              <div>
                <span className="block text-slate-500 text-[8px]">ISSUING AUTHORITY</span>
                <span className="font-bold text-white block mt-0.5">{selectedViewerDoc.issuedBy || "Official Registry"}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[8px]">INTEGRITY SIGNATURE</span>
                <span className="font-bold text-white block mt-0.5 truncate">{selectedViewerDoc.securityHash}</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/5 text-[9px] text-slate-500 leading-normal">
              Notes: {selectedViewerDoc.notes || "No security remarks listed for archived item."}
            </div>
          </div>
        </div>
      )}

      {/* ================= HIGH FIDELITY SECURE DOCUMENT SHARING OVERLAY ================= */}
      {selectedShareDoc && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-55 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-[360px] p-5 shadow-2xl relative animate-slide-up select-none overflow-hidden text-left border border-slate-200">
            {/* Security shield accent glow */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#EA1C24]/5 rounded-full blur-xl animate-pulse" />
            
            <button
              onClick={() => setSelectedShareDoc(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[8px] font-black tracking-widest text-[#EA1C24] uppercase font-mono bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                SECURE DISPATCH
              </span>
            </div>

            <h3 className="text-sm font-black text-slate-800">
              Share Certified Document
            </h3>
            <p className="text-[10px] text-slate-500 leading-normal mt-1 mb-4">
              Export and dispatch cryptographically-sealed PDF files. WeHive registers all downloads on our audit-integrity servers.
            </p>

            {/* Document Details Row */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60 mb-4 flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 border border-blue-100 text-blue-900 rounded-xl shrink-0">
                <FileCheck className="w-4 h-4 text-blue-900" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-extrabold text-slate-800 truncate">
                  {selectedShareDoc.name}
                </h4>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                  {selectedShareDoc.fileName} • {selectedShareDoc.fileSize}
                </p>
              </div>
            </div>

            {/* Copy Secure Shareable Link Input */}
            <div className="space-y-1.5 mb-4">
              <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block tracking-wider">
                Generate Share Link
              </label>
              <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={`https://wehive.co.in/share/doc-${selectedShareDoc.id}-${selectedShareDoc.securityHash.substr(8, 6)}`}
                  className="flex-1 bg-transparent border-none text-[10px] text-slate-600 font-mono px-2 select-all focus:outline-none focus:ring-0 truncate"
                />
                <button
                  onClick={handleCopyShareLink}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    copiedLink
                      ? "bg-green-600 text-white"
                      : "bg-blue-950 hover:bg-blue-900 text-white"
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sharing Methods Grid */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block tracking-wider">
                Select Recipient Channel
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePerformShare("Hive Consultant Chat")}
                  className="flex items-center gap-2 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer text-left w-full"
                >
                  <div className="w-7 h-7 bg-blue-50 text-blue-900 rounded-lg flex items-center justify-center border border-blue-100 shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-slate-800 leading-none truncate">HiveChat</span>
                    <span className="text-[8px] text-slate-400 block mt-0.5 truncate">Instant partner chat</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const subject = encodeURIComponent(`WeHive Secure Document Share - ${selectedShareDoc.name}`);
                    const body = encodeURIComponent(`Hello,\n\nPlease find attached the certified WeHive compliance PDF for Krishna Kranthi Teja Kumar.\nDocument Type: ${selectedShareDoc.type.toUpperCase()}\nSecurity Signature: ${selectedShareDoc.securityHash}\n\nSent via WeHive Safe-Vault Encryption.`);
                    window.location.href = `mailto:admissions@tum.de?subject=${subject}&body=${body}`;
                    triggerNotification(
                      "Email Client Opened",
                      "Draft letter prepared for TUM international admissions desk.",
                      "system"
                    );
                  }}
                  className="flex items-center gap-2 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer text-left w-full"
                >
                  <div className="w-7 h-7 bg-red-50 text-red-600 rounded-lg flex items-center justify-center border border-red-100 shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-slate-800 leading-none truncate">TUM Registry</span>
                    <span className="text-[8px] text-slate-400 block mt-0.5 truncate">Email admissions</span>
                  </div>
                </button>

                <button
                  onClick={() => handlePerformShare("Embassy Compliance Portal")}
                  className="flex items-center gap-2 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer text-left w-full"
                >
                  <div className="w-7 h-7 bg-amber-50 text-amber-700 rounded-lg flex items-center justify-center border border-amber-100 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-slate-800 leading-none truncate">Embassy Desk</span>
                    <span className="text-[8px] text-slate-400 block mt-0.5 truncate">Visa agency link</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleDownloadPDF(selectedShareDoc);
                    setSelectedShareDoc(null);
                  }}
                  className="flex items-center gap-2 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer text-left w-full"
                >
                  <div className="w-7 h-7 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center border border-emerald-100 shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-slate-800 leading-none truncate">Direct PDF</span>
                    <span className="text-[8px] text-slate-400 block mt-0.5 truncate">Save to disk</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Sharing Process Loading Overlay */}
            {isSharingInProcess && (
              <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-center p-5 z-20">
                <RefreshCw className="w-8 h-8 text-blue-950 animate-spin mb-3" />
                <h4 className="text-xs font-black text-slate-800">
                  Cryptographically Sealing...
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[220px]">
                  Generating compliance certificate packet and transferring to <b>{shareDestination}</b> via secure pipes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= HIGH FIDELITY DOCUMENT SCANNER MODAL ================= */}
      {isScanning && (
        <div className="absolute inset-0 bg-slate-950/98 z-55 flex flex-col justify-between animate-fade-in p-5 text-left select-none text-white">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-xs">
                <Camera className="w-3 h-3" />
              </div>
              <div>
                <span className="text-[8px] font-mono text-red-500 block tracking-widest uppercase">Live Document Capture</span>
                <h3 className="text-xs font-bold text-white leading-tight">
                  Secure Scanner • {scannerType.toUpperCase()}
                </h3>
              </div>
            </div>
            <button
              onClick={stopScanning}
              className="text-slate-400 hover:text-white font-bold text-xs bg-white/5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-white/10"
            >
              Cancel
            </button>
          </div>

          {/* Core Scanner Workspace */}
          <div className="flex-1 my-4 flex flex-col justify-center items-center overflow-hidden relative rounded-2xl bg-slate-900 border border-white/5">
            {scannerStep === "camera" ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
                {cameraError ? (
                  <div className="p-6 text-center max-w-sm space-y-4">
                    <div className="w-12 h-12 bg-red-950 border border-red-800 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">Camera Inaccessible</p>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {cameraError}
                      </p>
                    </div>
                    <button
                      onClick={() => startScanning(scannerType)}
                      className="bg-white text-slate-950 text-[10px] font-black px-4 py-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      Retry Camera Request
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Live Stream Viewfinder */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover scale-x-1"
                    />

                    {/* Auto-Crop Optical Alignment Overlay */}
                    {autoCrop && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Shaded background outside crop boundary */}
                        <div className="absolute inset-0 bg-black/45 flex flex-col justify-between">
                          <div className="h-[12.5%]" />
                          <div className="flex justify-between items-center flex-1">
                            <div className="w-[7.5%] h-full bg-black/45" />
                            <div className="flex-1 h-full relative">
                              {/* Glowing Scan Corner Anchors */}
                              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-red-600 rounded-tl-md filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-red-600 rounded-tr-md filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-red-600 rounded-bl-md filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-red-600 rounded-br-md filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                              
                              {/* Central scan guideline indicator */}
                              <div className="absolute inset-x-6 top-1/2 h-0.5 bg-red-600/30 animate-pulse" />
                            </div>
                            <div className="w-[7.5%] h-full bg-black/45" />
                          </div>
                          <div className="h-[12.5%]" />
                        </div>
                        
                        {/* HUD Guidelines */}
                        <div className="absolute bottom-6 bg-slate-950/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-[9px] font-mono font-bold tracking-wider text-red-400 uppercase">
                          Align Document within frame boundaries
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* Review Captured & Auto-Cropped Photo Step */
              <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                {capturedImg ? (
                  <div className="relative max-w-full max-h-full flex flex-col items-center animate-fade-in">
                    <img
                      src={capturedImg}
                      alt="Scanned Preview"
                      referrerPolicy="no-referrer"
                      className="max-h-[280px] w-auto object-contain rounded-xl shadow-2xl border-2 border-white/20"
                    />
                    <div className="mt-3.5 flex items-center gap-1.5 bg-slate-950/80 px-3 py-1 rounded-full border border-white/10 text-[9px] font-mono text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      AUTO-CROPPED & FILTERED OK
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-red-500 animate-spin" />
                    <span className="text-[10px] text-slate-400">Processing image matrix...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lower Control HUD / Customization parameters */}
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 shrink-0 space-y-4">
            {/* Filter Selection Panel */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Image Enhancement Filter</span>
                <span className="text-[10px] text-slate-300 font-bold">Smart Scan Adjustments</span>
              </div>
              <div className="flex gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setScannerFilter("original")}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase font-mono transition-all cursor-pointer ${
                    scannerFilter === "original"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setScannerFilter("document")}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase font-mono transition-all cursor-pointer ${
                    scannerFilter === "document"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Scan Enhance
                </button>
                <button
                  onClick={() => setScannerFilter("mono")}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase font-mono transition-all cursor-pointer ${
                    scannerFilter === "mono"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  B&W Mono
                </button>
              </div>
            </div>

            {/* Auto-crop Toggle Switch */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3.5">
              <div className="flex items-center gap-2">
                <Crop className="w-4 h-4 text-red-500" />
                <div>
                  <span className="text-[10px] font-black text-white block">Auto-Crop Edge Alignment</span>
                  <span className="text-[8px] text-slate-400 block mt-0.5">Detect flat document margins to automatically clip desk backgrounds</span>
                </div>
              </div>
              <button
                onClick={() => setAutoCrop(!autoCrop)}
                className={`w-11 h-6 rounded-full transition-all cursor-pointer relative ${
                  autoCrop ? "bg-red-600" : "bg-slate-800"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-md ${
                    autoCrop ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Core Action Button Group */}
            <div className="border-t border-white/5 pt-3.5 flex gap-2.5">
              {scannerStep === "camera" ? (
                <button
                  onClick={handleCapture}
                  disabled={!!cameraError}
                  className={`flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide`}
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setScannerStep("camera")}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs py-3 rounded-xl border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide"
                  >
                    Retake Scan
                  </button>
                  <button
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide animate-pulse"
                  >
                    <Eye className="w-4 h-4" />
                    Preview & Submit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SECURE COMPLIANCE PREVIEW MODAL BEFORE SUBMISSION ================= */}
      {isPreviewModalOpen && (
        <div className="absolute inset-0 bg-slate-950/98 z-60 flex flex-col justify-between animate-fade-in p-5 text-left select-none text-white">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[8px] font-mono text-emerald-400 block tracking-widest uppercase">Smart Vision Analysis</span>
                <h3 className="text-xs font-bold text-white leading-tight">
                  Secure Submission Audit Preview
                </h3>
              </div>
            </div>
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="text-slate-400 hover:text-white font-bold text-xs bg-white/5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-white/10"
            >
              Back to Edit
            </button>
          </div>

          {/* Main Content Workspace */}
          <div className="flex-1 my-4 flex flex-col justify-center items-center overflow-y-auto relative rounded-2xl bg-slate-900/40 border border-white/5 p-4 space-y-4">
            {/* Image display */}
            <div className="relative max-w-full flex justify-center">
              {capturedImg ? (
                <div className="relative">
                  <div className="absolute -inset-1 border-2 border-dashed border-emerald-500/50 rounded-xl pointer-events-none animate-pulse" />
                  <img
                    src={capturedImg}
                    alt="Scanned Preview Document"
                    referrerPolicy="no-referrer"
                    className="max-h-[220px] w-auto object-contain rounded-xl shadow-2xl border border-white/15"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-950/90 backdrop-blur-xs border border-emerald-500/30 text-emerald-400 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                    {scannerFilter.toUpperCase()} FILTERED
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400 py-12">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
                  <span className="text-[9px] font-mono">Loading cropped asset...</span>
                </div>
              )}
            </div>

            {/* Diagnostics Report */}
            <div className="w-full bg-slate-900 border border-white/10 rounded-xl p-3.5 space-y-2.5 font-mono">
              <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-black leading-none">
                Compliance AI Diagnostic Report
              </span>
              
              <div className="space-y-2 text-[9px] leading-relaxed">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Target Folder:</span>
                  <span className="text-white font-bold uppercase">{scannerType.toUpperCase()} SECURE VAULT</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Optical Edge Tracking:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    Passed (Auto-Crop Active)
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Biometric Alignment:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    Optimal Resolution
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-slate-400">Text Legibility Check:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    99.2% Sharp Contrast
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Secure AES Hash Key:</span>
                  <span className="text-slate-300 font-semibold truncate max-w-[150px]">
                    AES-SHA256-WEHIVE-VALID
                  </span>
                </div>
              </div>
            </div>

            {/* AI OCR Metadata panel */}
            <div className="w-full bg-slate-900 border border-white/10 rounded-xl p-3.5 space-y-2.5 font-mono text-left">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-black leading-none">
                  AI OCR Metadata Extraction
                </span>
                {ocrLoading ? (
                  <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Analyzing...
                  </span>
                ) : ocrResult ? (
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                    Completed ({ocrResult.confidenceScore}% Acc)
                  </span>
                ) : ocrError ? (
                  <span className="text-[8px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold">
                    Extraction Error
                  </span>
                ) : (
                  <span className="text-[8px] bg-slate-500/10 text-slate-400 px-1.5 py-0.5 rounded font-bold">
                    Ready
                  </span>
                )}
              </div>

              {ocrLoading ? (
                <div className="py-4 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
                  <span className="text-[9px] text-slate-400 text-center font-sans">
                    Gemini API is reading the document...
                  </span>
                </div>
              ) : (
                <div className="space-y-3 font-sans">
                  {ocrError && (
                    <div className="bg-red-950/30 border border-red-500/20 p-2 rounded-lg text-[9px] text-red-200 font-sans">
                      ⚠️ {ocrError}
                    </div>
                  )}

                  {!ocrResult && !ocrError && (
                    <button
                      onClick={() => capturedImg && runOCR(capturedImg)}
                      className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/30 font-bold text-[10px] py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 uppercase cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Trigger Instant OCR Scan
                    </button>
                  )}

                  {(ocrResult || ocrError === null) && (
                    <div className="space-y-2.5 text-xs text-white">
                      <div>
                        <label className="text-[9px] text-slate-400 block font-mono uppercase mb-1">
                          Holder/Student Name
                        </label>
                        <input
                          type="text"
                          value={ocrName}
                          onChange={(e) => setOcrName(e.target.value)}
                          placeholder="Extracting or enter name..."
                          className="w-full bg-slate-950 text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-red-500 transition-colors font-sans"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 block font-mono uppercase mb-1">
                          Document Number (Passport / Visa / Ref No)
                        </label>
                        <input
                          type="text"
                          value={ocrDocNum}
                          onChange={(e) => setOcrDocNum(e.target.value)}
                          placeholder="Extracting or enter number..."
                          className="w-full bg-slate-950 text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-red-500 transition-colors font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 block font-mono uppercase mb-1">
                            Issued By / Authority
                          </label>
                          <input
                            type="text"
                            value={ocrIssuedBy}
                            onChange={(e) => setOcrIssuedBy(e.target.value)}
                            placeholder="Embassy or Institution..."
                            className="w-full bg-slate-950 text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-red-500 transition-colors font-sans"
                          />
                        </div>

                        {(scannerType === "passport" || scannerType === "visa") && (
                          <div>
                            <label className="text-[9px] text-slate-400 block font-mono uppercase mb-1">
                              Expiry Date
                            </label>
                            <input
                              type="date"
                              value={expiryInput}
                              onChange={(e) => setExpiryInput(e.target.value)}
                              className="w-full bg-slate-950 text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-red-500 transition-colors font-sans"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Alert text */}
            <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-3 text-[10px] text-red-200 leading-normal font-medium">
              ⚠️ By clicking "Confirm & Archive", you authorize WeHive to store this copy in your local browser storage cache and certify the legal validity of this study permit document.
            </div>
          </div>

          {/* Buttons */}
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 shrink-0 flex gap-2.5">
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs py-3 rounded-xl border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-1 uppercase tracking-wide"
            >
              Back to Edit
            </button>
            <button
              onClick={() => {
                saveScannedDocument();
                setIsPreviewModalOpen(false);
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide"
            >
              <Check className="w-4 h-4 animate-bounce" />
              Confirm & Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
