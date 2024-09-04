'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Header from '@/components/layout/Header';
import { CiLock,CiUnlock  } from "react-icons/ci";

type ThreadCategory = "THREAD" | "QNA" | "hundar";

type Thread = {
  id: string;
  title: string;
  category: ThreadCategory;
  creationDate: string;
  description: string;
  creator: string;
  locked: boolean;
};

type Comment = {
  id: string;
  threadId: string;
  content: string;
  creator: string;
  createdAt: Timestamp;
};

const ThreadDetailPage: React.FC = () => {
  const pathname = usePathname();
  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [locked, setLocked] = useState<boolean>(false);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const threadId = pathname?.split('/').pop();
    if (threadId) {
      const fetchThread = async () => {
        try {
          const threadDoc = await getDoc(doc(db, 'threads', threadId));
          if (threadDoc.exists()) {
            const threadData = threadDoc.data() as Thread;
            setThread(threadData);
            setLocked(threadData.locked);
          } else {
            console.log('No such thread!');
          }
        } catch (error) {
          console.error('Error fetching thread:', error);
        }
      };

      const fetchComments = async () => {
        try {
          const commentsQuery = query(
            collection(db, 'comments'),
            where('threadId', '==', threadId)
          );
          const commentsSnapshot = await getDocs(commentsQuery);
          const commentsData = commentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: (data.createdAt as Timestamp) || Timestamp.now()
            };
          }) as Comment[];
          setComments(commentsData);
        } catch (error) {
          console.error('Error fetching comments:', error);
        }
      };

      fetchThread();
      fetchComments();
    }
  }, [pathname]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      console.error('User is not logged in.');
      return;
    }
    const threadId = pathname?.split('/').pop();
    if (threadId && newComment.trim()) {
      try {
        const newCommentData = {
          content: newComment,
          createdAt: serverTimestamp(),
          creator: user?.uid || 'Anonymous', // Replace with actual user ID
          threadId: threadId
        };
        const docRef = await addDoc(collection(db, 'comments'), newCommentData);
        const addedComment = {
          ...newCommentData,
          id: docRef.id,
          createdAt: Timestamp.now() // Use current timestamp for immediate display
        } as Comment;
        setComments([...comments, addedComment]);
        setNewComment('');
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    }
  };

  const lockThread = async () => {
    if (!user) {
      console.error('User is not logged in.');
      return;
    }

    if (thread?.creator !== user.uid) {
      console.error('User is not the creator of the thread.');
      return;
    }

    const threadId = pathname?.split('/').pop();
    if (threadId) {
      try {
        await updateDoc(doc(db, 'threads', threadId), {
          locked: true 
        });
        setLocked(true);
      } catch (error) {
        console.error('Error locking thread:', error);
      }
    }
  };

  const unlockThread = async () => {
    if (!user) {
      console.error('User is not logged in.');
      return;
    }

    if (thread?.creator !== user.uid) {
      console.error('User is not the creator of the thread.');
      return;
    }

    const threadId = pathname?.split('/').pop();
    if (threadId) {
      try {
        await updateDoc(doc(db, 'threads', threadId), {
          locked: false 
        });
        setLocked(false);
      } catch (error) {
        console.error('Error unlocking thread:', error); 
      }
    }
  };

  const sortedComments = comments.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

  return (
    <div>
      <Header />
      <div className="container mx-auto p-4">
        {thread ? (
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h1 className="text-2xl font-bold mb-4 dark:text-black">{thread.title}</h1>
            <p className="text-gray-700 mb-4">{thread.description}</p>
            <p className="text-sm text-gray-500">Category: {thread.category}</p>
            <p className="text-sm text-gray-500">Created by: {thread.creator}</p>
            <p className="text-sm text-gray-500">Creation Date: {new Date(thread.creationDate).toLocaleString()}</p>
          </div>
        ) : (
          <p>Loading thread...</p>
        )}
        <div>
          <div className='flex justify-between'>
             <h2 className="text-xl font-bold mb-4">Comments</h2>
          {
            thread?.creator === user?.uid && (
               locked ? 
              <button onClick={unlockThread} className="bg-red-500 text-white px-4 py-1 rounded"><CiLock /></button> : 
              <button onClick={lockThread} className="bg-green-500 text-white px-4 py-1 rounded"><CiUnlock /></button>
            )
           
          }
          </div>
         
      
          {sortedComments.length > 0 ? (
            sortedComments.map(comment => (
              <div key={comment.id} className="bg-gray-100 p-4 mb-4 rounded-lg">
                <p className="text-gray-700">{comment.content}</p>
                <p className="text-sm text-gray-500">By: {comment.creator}</p>
                <p className="text-sm text-gray-500">At: {comment.createdAt.toDate().toLocaleString()}</p>
              </div>
            ))
          ) : (
            <p className='pb-5'>No comments yet.</p>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">Add a Comment</h2>
          {
            !user ? (
              <p>Please log in to add a comment.</p>
            ) : locked ?(
              <p>Thread is locked</p>
            ):  
            <form onSubmit={handleCommentSubmit} className="bg-white shadow-md rounded-lg p-6 mb-6">
              <textarea
                className="w-full p-2 mb-4 border rounded text-black"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your comment here..."
                rows={4}
              />
              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                Submit
              </button>
            </form>
          }
        </div>
      </div>
    </div>
  );
};

export default ThreadDetailPage;