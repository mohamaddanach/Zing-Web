import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot ,query, where , doc,updateDoc} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBuh5e6OsM92P7c11XKOKxhZxsLEc0Q8PE",
    authDomain: "zingdb-9653d.firebaseapp.com",
    projectId: "zingdb-9653d",
    storageBucket: "zingdb-9653d.appspot.com", 
    messagingSenderId: "72448395530",
    appId: "1:72448395530:web:dadc8947a300cbea6c12f3",
    measurementId: "G-5D61PS4HN6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let sellerData = null; 
const stored_data = sessionStorage.getItem('currentSeller');
if (stored_data) {
    sellerData = JSON.parse(stored_data);
    document.getElementById('seller_name').innerText = sellerData.name || "Unknown";
    document.getElementById('display_id').innerText = sellerData.seller_id || "N/A";
    document.getElementById('display_category').innerText = sellerData.product_category || "N/A";
    
    if (sellerData.profile_image) {
        const img = document.getElementById('display_img');
        img.src = sellerData.profile_image;
        img.style.display = 'block';
    }
} else {
    window.location.href = 'seller_login.html';
}

document.getElementById('logout_btn').onclick = () => {
    sessionStorage.removeItem('currentSeller');
    window.location.href = 'seller_login.html';
};
const coll_name = 'products_' +sellerData.product_category;
const product_in_inventory = collection(db, coll_name);
const mycontainerquery = query(product_in_inventory, where("seller_id" ,"==",sellerData.seller_id));
const add_prd_btn = document.getElementById('add_to_inventroy');

if (add_prd_btn) {
    add_prd_btn.addEventListener('click', async (e) => {
        e.preventDefault();

        if (!sellerData) {
            alert("Error: No seller data found. Please log in again.");
            return;
        }

        const fileInput = document.getElementById('image');
        const files = fileInput ? fileInput.files : [];

        if (files.length === 0) {
            alert("Please upload at least one image");
            return;
        }

        const read_the_file = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
        };

        try {
            const imagePromises = Array.from(files).map(file => read_the_file(file));
            const build_array = await Promise.all(imagePromises);
            const priceInput = document.getElementById('price').value;
            const seller_price = parseFloat(priceInput);
            if (isNaN(seller_price)) {
                alert("Please enter a valid numeric price");
                return;
            }
            const priceonplatform = Number((seller_price * 1.08).toFixed(2));
            const added_value = Number(priceonplatform-seller_price);
            const profit_one_item = Number(added_value/2);
            const bonus_reserve = Number(added_value/2);
            await addDoc(product_in_inventory, {
                seller_id: sellerData.seller_id,
                seller_name: sellerData.name, 
                product_name: document.getElementById('product_name').value,
                sub_title: document.getElementById('sub_title').value,
                description: document.getElementById('description').value,
                quantity: Number(document.getElementById('qty').value),
                price: seller_price,
                priceonplatform : priceonplatform, 
                added_value : added_value,
                profit_one_item : profit_one_item,
                bonus_reserve : bonus_reserve,
                images: build_array,
                status: false,
                date: new Date()
            });
            alert("The product is added successfully");
            document.querySelector('.add_product').reset();               
        } catch (error) {
            console.error("Error saving to Firestore:", error);
            alert("Failed to add. Document might be too large (max 1MB).");
        }
    });
}

onSnapshot(mycontainerquery, (snapshot)=>{
    const container = document.getElementById('inventory_container');
    let finalhtml='';
    snapshot.docs.forEach(documentSnapshot => {
        
        const data = documentSnapshot.data();
        const docId = documentSnapshot.id;
        const imageSrc = (data.images && data.images.length >0) ? data.images[0] : 'https://via.placeholder.com/50';
        const statusText = data.status ? "In Showroom" : "Out of Showroom";
        const btnClass = data.status ? "btn-on" : "btn-off";
        finalhtml +=`
        <div style="border: 1px solid #ccc; margin: 10px; padding: 10px; display: flex; align-items: center; gap: 15px;">
                <img src="${imageSrc}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
                <div style="flex-grow: 1;">
                    <strong>${data.product_name}</strong> <small>(${data.sub_title})</small>
                    <p style="margin: 5px 0;">Your Price: $${data.price} | Platform: $${data.priceonplatform}</p>
                    <p style="margin: 5px 0;">Qty: ${data.quantity}</p>
                </div>
                <div>
                    <button type="button" class="${btnClass}" onclick="toggleStatus('${docId}', ${data.status})">
                        ${statusText}
                    </button>
                </div>
            </div>

        `;

    });
    if (container) {
        container.innerHTML = finalhtml;
    }
});
window.toggleStatus = async (id, currentStatus) => {
    const docRef = doc(db, coll_name, id);
    try {
        await updateDoc(docRef, {
            status: !currentStatus 
        });
    } catch (error) {
        console.error("Error updating status:", error);
    }
};
const showrromquery = query(
    product_in_inventory, 
    where("seller_id", "==", sellerData.seller_id), 
    where("status", "==", true)
);
onSnapshot(showrromquery, (snapshot)=>{
    const container = document.getElementById('showroom');
    let finalhtml='';
    snapshot.docs.forEach(documentSnapshot => {
        
        const data = documentSnapshot.data();
        const docId = documentSnapshot.id;
        const imageSrc = (data.images && data.images.length >0) ? data.images[0] : 'https://via.placeholder.com/50';
        const statusText = data.status ? "In Showroom" : "Out of Showroom";
        const btnClass = data.status ? "btn-on" : "btn-off";
        finalhtml +=`
        <div style="border: 1px solid #ccc; margin: 10px; padding: 10px; display: flex; align-items: center; gap: 15px;">
                <img src="${imageSrc}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
                <div style="flex-grow: 1;">
                    <strong>${data.product_name}</strong> <small>(${data.sub_title})</small>
                    <p style="margin: 5px 0;">Your Price: $${data.price} | Platform: $${data.priceonplatform}</p>
                    <p style="margin: 5px 0;">Qty: ${data.quantity}</p>
                </div>
                <div>
                    <button type="button" class="${btnClass}" onclick="toggleStatus('${docId}', ${data.status})">
                        ${statusText}
                    </button>
                </div>
            </div>

        `;

    });
    if (container) {
        container.innerHTML = finalhtml;
    }
});