export type PhotoSession = {
  id: number;
  imageData: string | null;
  isApproved: boolean;
};

export type SessionState = {
  session1: PhotoSession;
  session2: PhotoSession;
  currentSession: 1 | 2;
};

export type ProcessedImage = {
  original: string;
  framed: string;
  date: string;
};