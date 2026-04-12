import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

const AvatarUpload = ({ currentAvatar, name, onUploadSuccess }) => {
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Validation client rapide
        if (selectedFile.size > 2 * 1024 * 1024) {
            setError("L'image est trop lourde (max 2Mo)");
            return;
        }

        if (!selectedFile.type.startsWith('image/')) {
            setError("Veuillez choisir une image");
            return;
        }

        setError(null);
        setFile(selectedFile);

        // Créer une preview locale
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('photo', file);

        try {
            // Utilisation de l'endpoint dédié
            const response = await api.post('users/profiles/upload-avatar/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setFile(null);
            setPreview(null);
            if (onUploadSuccess) {
                onUploadSuccess(response.data);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.photo?.[0] || "Erreur lors de l'upload");
        } finally {
            setLoading(false);
        }
    };

    const cancelPreview = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="relative group">
                <Avatar
                    src={preview || currentAvatar}
                    name={name}
                    size="2xl"
                    className="ring-4 ring-white shadow-xl transition-all duration-300 group-hover:opacity-90"
                />

                {!preview && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-110 active:scale-95 z-10"
                        title="Changer la photo"
                    >
                        <Camera size={20} />
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            {error && (
                <p className="text-sm text-red-500 font-medium flex items-center gap-2 animate-shake">
                    <X size={14} /> {error}
                </p>
            )}

            {preview && (
                <div className="flex items-center gap-3 animate-fadeIn">
                    <Button
                        variant="secondary"
                        onClick={cancelPreview}
                        disabled={loading}
                        className="rounded-full px-6"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handleUpload}
                        isLoading={loading}
                        className="rounded-full px-8 bg-blue-600 hover:bg-blue-700"
                    >
                        Enregistrer
                    </Button>
                </div>
            )}
        </div>
    );
};

export default AvatarUpload;
