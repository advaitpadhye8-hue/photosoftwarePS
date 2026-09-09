import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const gallery = document.getElementById('gallery');
const photoCount = document.getElementById('photoCount');
const imageInput = document.getElementById('imageInput');
const statusMessage = document.getElementById('statusMessage');

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';

if (!isFirebaseConfigured) {
  statusMessage.textContent = 'Add your Firebase config to enable shared uploads';
  gallery.innerHTML = '<div class="empty-state">Your app is ready, but Firebase is not configured yet.</div>';
  photoCount.textContent = '0 images';
} else {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const storage = getStorage(app);

  function updatePhotoCount(count) {
    photoCount.textContent = `${count} image${count === 1 ? '' : 's'}`;
  }

  function showEmptyState() {
    gallery.innerHTML = '<div class="empty-state">No photos yet. Be the first to upload one.</div>';
    updatePhotoCount(0);
  }

  function createPhotoCard(photo) {
    const card = document.createElement('article');
    card.className = 'photo-card';

    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.name;

    const body = document.createElement('div');
    body.className = 'card-body';

    const name = document.createElement('span');
    name.className = 'photo-name';
    name.textContent = photo.name;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const link = document.createElement('a');
    link.className = 'download-link';
    link.href = photo.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.download = photo.name;
    link.textContent = 'Download';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', async () => {
      try {
        await deleteObject(ref(storage, photo.storagePath));
        await deleteDoc(doc(db, 'photos', photo.id));
        await loadPhotos();
        statusMessage.textContent = 'Photo deleted';
      } catch (error) {
        console.error(error);
        statusMessage.textContent = 'Could not delete photo';
      }
    });

    actions.append(link, removeBtn);
    body.append(name, actions);
    card.append(img, body);
    return card;
  }

  async function loadPhotos() {
    try {
      const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const photos = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

      gallery.innerHTML = '';

      if (!photos.length) {
        showEmptyState();
        return;
      }

      photos.forEach((photo) => gallery.appendChild(createPhotoCard(photo)));
      updatePhotoCount(photos.length);
      statusMessage.textContent = 'Gallery loaded';
    } catch (error) {
      console.error(error);
      showEmptyState();
      statusMessage.textContent = 'Could not load gallery';
    }
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith('image/'));

    if (!validFiles.length) {
      statusMessage.textContent = 'Please choose valid image files';
      return;
    }

    try {
      statusMessage.textContent = 'Uploading...';

      for (const file of validFiles) {
        const filePath = `public-photos/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        const uploadResult = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(uploadResult.ref);

        await addDoc(collection(db, 'photos'), {
          name: file.name,
          url,
          storagePath: filePath,
          createdAt: serverTimestamp(),
        });
      }

      await loadPhotos();
      statusMessage.textContent = `${validFiles.length} photo${validFiles.length > 1 ? 's' : ''} uploaded successfully`;
      imageInput.value = '';
    } catch (error) {
      console.error(error);
      statusMessage.textContent = 'Upload failed. Check Firebase config and rules.';
    }
  }

  imageInput.addEventListener('change', handleUpload);
  loadPhotos();
}
