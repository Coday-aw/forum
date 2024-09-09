import { db } from '@/firebase';
import { Thread, User } from "@/lib/types";
import { collection, getDocs, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'


type ThreadCategory = "THREAD" | "QNA";



function ListThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [users, setUsers] = useState<{ [key: string]: User }>({});

  useEffect(() => {
    async function fetchData() {
      // Query to get the latest 5 threads, ordered by creationDate descending
      const q = query(collection(db, 'threads'), orderBy('creationDate', 'desc'), limit(5));
      const querySnapshot = await getDocs(q);

      const threadsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Thread));
      setThreads(threadsData);

      // Fetch user details for each thread creator
      const userPromises = threadsData.map(thread => getDoc(doc(db, 'users', thread.creator)));
      const userDocs = await Promise.all(userPromises);
      const usersData = userDocs.reduce((acc, userDoc) => {
        if (userDoc.exists()) {
          acc[userDoc.id] = userDoc.data() as User;
        }
        return acc;
      }, {} as { [key: string]: User });
      setUsers(usersData);
    }
    fetchData();
  }, []);

  return (
    <div>
      <h2 className='font-bold text-xl pb-3'>Latest Threads</h2>
      {threads.length > 0 ? (
        <ul>
          {threads.map(thread => (
            <li key={thread.id}>
              <Link href={`/threads/${thread.id}`}>
              <div className='bg-white shadow-md rounded-lg p-6 mb-6 hover:opacity-65'>
                <div className='flex'>
                  <h2 className='font-semibold flex-1 dark:text-black text-lg'>
                    {thread.title}
                  </h2>
                  <span className='bg-gray-700 text-white px-2 py-1 text-sm rounded-md'>{thread.category}</span>
                </div>
                <p className='text-sm text-gray-500'>
                  Posted by {users[thread.creator]?.userName || 'Unknown'} at {new Intl.DateTimeFormat('sv-SE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }).format(new Date(thread.creationDate))}
                </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div>
          <Skeleton count={5} height={100} />
        </div>
      )}
    </div>
  );
}

export default ListThreads;