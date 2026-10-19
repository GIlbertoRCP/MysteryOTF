import React from 'react';
import { LucideIcon, Eye, Camera, ClipboardCheck, FileText, BookOpen, Stethoscope, Fingerprint, Footprints, Microscope, Package, Phone, TestTube, Receipt, Clock, Gem, Megaphone } from 'lucide-react';
import { EvidenceKind } from '../types';

const ICONS: Record<EvidenceKind, LucideIcon> = {
  witness: Eye,
  camera: Camera,
  record: ClipboardCheck,
  document: FileText,
  diary: BookOpen,
  autopsy: Stethoscope,
  smudge: Fingerprint,
  shoeprint: Footprints,
  trace: Microscope,
  phone: Phone,
  scrapings: TestTube,
  receipt: Receipt,
  sighting: Clock,
  planted: Gem,
  claim: Megaphone,
  weapon: Package,
};

export const KindIcon: React.FC<{ kind: EvidenceKind; size?: number; className?: string }> = ({ kind, size = 16, className }) => {
  const Icon = ICONS[kind];
  return <Icon size={size} className={className} strokeWidth={1.75} />;
};

export const KIND_ORDER: EvidenceKind[] = ['diary', 'autopsy', 'witness', 'camera', 'phone', 'smudge', 'shoeprint', 'trace', 'scrapings', 'record', 'sighting', 'claim', 'receipt', 'planted', 'document', 'weapon'];
