import {
  getDownloadURL,
  ref,
  StorageReference,
  updateMetadata,
  uploadBytesResumable
} from "firebase/storage";
import React, { ChangeEvent, useState } from "react";
import imageCompression from 'browser-image-compression';
import styles from './ContestDetails.module.css';
import ContestSubmission from "../ContestSubmission";
import ImageUploadButton from "../UploadButton";
import { Contest, Submission } from "../constants/Constants";
import { doc, setDoc } from "firebase/firestore";
import ContestViewer from "../ContestViewer";
import { useAuth, useFirestore, useStorage } from "reactfire";

type OpenContestDetailsProps = {
  contest: Contest
  submissions?: Submission[]
  onClickSubmission: (submission: Submission) => void
  showViewer: boolean
  onCloseViewer: () => void
}

export default function OpenContestDetails(props: OpenContestDetailsProps) {
  const auth = useAuth()
  const storage = useStorage()
  const db = useFirestore()
  const userFolder = ref(storage, auth.currentUser?.uid)
  const [uploadPhase, setUploadPhase] = useState<string | undefined>()
  const [uploadProgress, setUploadProgress] = useState<number | undefined>()

  const submission = props.submissions
      ?.filter(submission => submission.id === auth.currentUser!.uid)
      ?.at(0)

  async function submitToContest(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length !== 1) return

    setUploadPhase('Compressing...')
    setUploadProgress(0)
    const file = event.target.files[0]
    const compressedFile = await imageCompression(file, { maxSizeMB: 2, onProgress: (num) => setUploadProgress(num/100) })
    
    setUploadPhase('Uploading...')
    const fileRef = ref(userFolder, props.contest.id)
    const uploadTask = uploadBytesResumable(fileRef, compressedFile)

    uploadTask.on('state_changed',
      (snapshot) => setUploadProgress(snapshot.bytesTransferred / snapshot.totalBytes), // 
      (err) => { setUploadProgress(undefined); throw err },
      async () => {
        setUploadPhase('Updating your submission...')
        // Set the cache control metadata before setting the doc since setting the doc will
        // trigger the useSnapshot hook which downloads the image. We'd like the image to be
        // downloaded with the cache control HTTP header so the image is cached.
        updateCacheControlMetadata(fileRef)
        const imageUrl = await getDownloadURL(uploadTask.snapshot.ref)
        await setDoc(
          doc(db, "contests", props.contest.id, "submissions", auth.currentUser!.uid),
          { imageUrl }
        )
        setUploadProgress(undefined)
      }
    )
  }

  async function updateCacheControlMetadata(storageRef: StorageReference) {
    const metadata = {
      cacheControl: "private,max-age=3600",
    }

    await updateMetadata(storageRef, metadata)
  }

  return (
    <React.Fragment>
      { submission && <ContestViewer
          showViewer={props.showViewer}
          onClose={props.onCloseViewer}
          images={[{ src: submission!.imageUrl }]}
          activeIndex={0}
        />
      }

      <div className={styles.photoDrawer}>
      { submission &&
        <ContestSubmission
          key={submission.id}
          contest={props.contest}
          submission={submission}
          onSubmissionClick={props.onClickSubmission}
        />
      }
      </div>
      <ImageUploadButton onUploadFile={submitToContest} progressText={uploadPhase} progress={ uploadProgress } />
    </React.Fragment>
  )
}
