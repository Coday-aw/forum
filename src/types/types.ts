export type ThreadCategory = "THREAD" | "QNA";

export type User = {
  id: string;
  firstName: string;
  userName: string;
  password: string;
};

export type Thread = {
  id: string;
  title: string;
  category: ThreadCategory;
  creationDate: string;
  description: string;
  creator: string; // UID of the creator
  lcoked: boolean;
};
