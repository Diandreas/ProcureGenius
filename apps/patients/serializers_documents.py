from rest_framework import serializers
from .models_documents import PatientDocument

class PatientDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for PatientDocument
    """
    uploaded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientDocument
        fields = [
            'id',
            'organization',
            'patient',
            'title',
            'file',
            'description',
            'uploaded_at',
            'uploaded_by_name'
        ]
        read_only_fields = ['id', 'uploaded_at', 'organization']

    def get_uploaded_by_name(self, obj):
        # Assuming we might want to track who uploaded it later, but model doesn't have it yet. 
        # For now return "System" or similar if we add that field. 
        # Skipping for now to match model.
        return "N/A"
