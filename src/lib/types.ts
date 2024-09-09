import { Timestamp } from "firebase/firestore";

export type ThreadCategory = "THREAD" | "QNA";

export type Comment = {
  id: string;
  threadId: string;
  content: string;
  creator: string;
  createdAt: Timestamp;
};


export type ThreadTag = {
  toLowerCase: () => string;
  id: number;
  name: string;
};
 
export type QNAThread =  Thread & { //Type extension
	category: "QNA";
	isAnswered: boolean;
	commentAnswerId?: number;
}


export type Thread = {
  id: string;
  title: string;
  category: ThreadCategory;
  creationDate: string;
  description: string;
  creator: string; // UID of the creator
  locked: boolean;
  tags: ThreadTag[];
};

export type User = {
  id: string;
  firstName: string;
  userName: string;
  password: string;
  userUID: string;
  isModerator: boolean;
};
