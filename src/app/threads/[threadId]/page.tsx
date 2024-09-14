'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Header from '@/components/layout/Header';
import { Thread, User, Comment, QNAThread} from '@/lib/types';
import { FaEdit, FaLock, FaLockOpen } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { log } from 'console';





const ThreadDetailPage: React.FC = () => {
  const pathname = usePathname();
  const [thread, setThread] = useState<Thread | QNAThread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [creatorName, setCreatorName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [usernames, setUsernames] = useState<{ [key: string]: string }>({});
  const [currentUserUID, setCurrentUserUID] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [locked, setLocked] = useState<boolean>(false);
  const [isModerator, setIsModerator] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedDescription, setEditedDescription] = useState<string>('');
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        setCurrentUserUID(user.uid);

        // Fetch the current user's username
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setCurrentUserName(userData.userName);
          setIsModerator(userData.isModerator || false )
        }
      } else {
        setIsLoggedIn(false);
      }
    });

    const threadId = pathname?.split('/').pop();
    if (threadId) {
      const fetchThread = async () => {
        try {
          const threadDoc = await getDoc(doc(db, 'threads', threadId));
          if (threadDoc.exists()) {
            const threadData = threadDoc.data() as Thread 
            console.log(threadData);
            setThread(threadData);
            setLocked(threadData.locked);

            // Fetch the creator's username
            const userDoc = await getDoc(doc(db, 'users', threadData.creator));
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              setCreatorName(userData.userName);
            } else {
              console.log('No such user!');
            }
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

          // Fetch usernames for each comment creator
          const usernamesMap: { [key: string]: string } = {};
          await Promise.all(commentsData.map(async (comment) => {
            if (!usernamesMap[comment.creator]) {
              const userDoc = await getDoc(doc(db, 'users', comment.creator));
              if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                usernamesMap[comment.creator] = userData.userName;
              }
            }
          }));
          setUsernames(usernamesMap);
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
    const threadId = pathname?.split('/').pop();
    if (threadId && newComment.trim() && currentUserUID) {
      try {
        const newCommentData = {
          content: newComment,
          createdAt: serverTimestamp(),
          creator: currentUserUID,
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

        // Fetch the username for the new comment creator
        if (!usernames[currentUserUID]) {
          const userDoc = await getDoc(doc(db, 'users', currentUserUID));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUsernames((prevUsernames) => ({
              ...prevUsernames,
              [currentUserUID]: userData.userName
            }));
          }
        }
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    }
  };

  // function to lock thread
  const lockThread = async () => {
    if (!user) {
      console.error('User is not logged in.');
      return;
    }

    if (thread?.creator !== user.uid && !isModerator) {
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

  // function to unlock thread
  const unlockThread = async () => {
    if (!user) {
      console.error('User is not logged in.');
      return;
    }

    if (thread?.creator !== user.uid && !isModerator ) {
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

  // function to mark a comment as answer
  const markAsAnswer = async (commentId: string) => {
    if (!user) {
      console.error('User is not logged in.');
      return;
    }

    if (thread?.creator !== user.uid && !isModerator) {
      console.error('User is not the creator of the thread.');
      return;
    }

    const threadId = pathname?.split('/').pop();
    if (threadId) {
      try {
        await updateDoc(doc(db, 'threads', threadId), {
          isAnswered: true,
          commentAnswerId: commentId
        });
        setThread((prevThread) => {
          if (prevThread) {
            return {
              ...prevThread,
              isAnswered: true,
             commentAnswerId: commentId
            };
          }
          return prevThread;
        });
        toast.success('Comment marked as answer');
      } catch (error) {
        console.error('Error marking comment as answer:', error);
        toast.error('Error marking comment as answer');
      }
    }
  };


  // function to edit thread
  const handleEditThread = async () => {
    if (!user) {
      console.error('User is not logged in.');
      return;
    }

    if (thread?.creator !== user.uid && !isModerator) {
      console.error('User is not the creator of the thread.');
      return;
    }

    const threadId = pathname?.split('/').pop();
    if (threadId) {
      try {
        await updateDoc(doc(db, 'threads', threadId), {
          title: editedTitle,
          description: editedDescription
        });
        setThread((prevThread) => {
          if (prevThread) {
            return {
              ...prevThread,
              title: editedTitle,
              description: editedDescription
            };
          }
          return prevThread;
        });
        setIsEditing(false);
        toast.success('Thread updated successfully');
      } catch (error) {
        console.error('Error updating thread:', error);
        toast.error('Error updating thread');
      }
    }
  };


 
  // Sort comments by creation date
  const sortedComments = comments.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

  return (
    
    <div>
      <Header />
      <div className="container mx-auto p-4">
        {thread ? (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      {isEditing ? (
        <div>
          <div>
              <label className='text-black'>Title</label>
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-black bg-white dark:text-white dark:bg-black mb-4"
          />
          </div>
         <div>
            <label className='text-black'>Description</label>
          <textarea 
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-black bg-white dark:text-white dark:bg-black mb-4"
          />
         </div>
        
          <button
            onClick={handleEditThread}
            className="bg-blue-500 text-white p-2 px-4 rounded hover:opacity-65 mr-2"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="bg-gray-500 text-white p-2 px-4 rounded hover:opacity-65"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold mb-4 dark:text-black">{thread.title}</h1>
          <p className="text-gray-700 mb-4" style={{ whiteSpace: 'pre-wrap' }}>{thread.description}</p>
          <p className="text-sm text-gray-500">Created by: {creatorName}</p>
          <p className="text-sm text-gray-500">Creation Date: {new Date(thread.creationDate).toLocaleString()}</p>
          <p className="text-sm text-gray-500">Category: {thread.category}</p>
          <p className="text-sm text-gray-500">Tags: { thread.tags ? thread.tags.join(', ') : ""}</p>
          {(thread.creator === currentUserUID || isModerator) && (
            <button
              onClick={() => setIsEditing(true)}
              className=" text-black  rounded hover:opacity-65   "
            >
              <FaEdit className="inline mr-2" /> 
            </button>
          )}
        </div> 
      )} 
    </div>
        ) : (
          <p>Loading thread...</p>
        )}
        <div>
          <div className='flex justify-between'>
             <h2 className="text-xl font-bold mb-4">Comments</h2>
             {
              (thread?.creator === currentUserUID || isModerator) && (
                  locked ?
               <button onClick={unlockThread} > <FaLock /></button>  :
              <button onClick={lockThread} ><FaLockOpen/>  </button>
              )
             }
          </div>     
  {locked && isLoggedIn ? (
  <p className='mb-2'>Thread is locked</p>
) : (
  isLoggedIn && (
    <form onSubmit={handleCommentSubmit} className="my-4">
      <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded text-black bg-white dark:text-white dark:bg-black"
        placeholder="Add a comment..."
        required
      />
      <button type="submit" className="mt-2 bg-blue-500 text-white p-2 px-4 rounded hover:opacity-65">Submit</button>
    </form>
  )
)}
          {sortedComments.length > 0 ? (
            sortedComments.map((comment) => (
              <div key={comment.id} className="bg-white shadow-md rounded-lg p-5 px-6 mb-6">
                <p className="text-gray-800 pb-2" style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</p>
                <p className="text-sm text-gray-500 font-semibold pb-2">{usernames[comment.creator] || 'Unknown'}</p>
                <p className="text-gray-500 text-xs">{comment.createdAt.toDate().toLocaleString()}</p>
              {
              
  thread?.category === 'QNA' && (
    <button  
    className={`px-2 rounded-sm mt-2 ${(thread as QNAThread)?.commentAnswerId === comment.id ? 'bg-green-400' : 'bg-slate-400'}`} 
    onClick={() => markAsAnswer(comment.id)}
    disabled={(thread as QNAThread)?.commentAnswerId === comment.id || !isLoggedIn || locked}
  >
    {(thread as QNAThread)?.commentAnswerId === comment.id ? 'Answer' : 'Mark as Answer'}
  </button>
  )


}
              </div>
            ))
          ) : (
            <p>No comments yet.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default ThreadDetailPage;






