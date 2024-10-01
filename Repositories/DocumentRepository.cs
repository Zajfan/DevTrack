// DocumentRepository.cs
using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Reflection.Metadata;

namespace DevTrack.Repositories
{
    public class DocumentRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["DevTrackConnection"].ConnectionString;

        public List<Document> GetAllDocuments()
        {
            // ... (Implement GetAllDocuments with try-catch and empty list handling) ...
        }

        public void CreateDocument(Document document)
        {
            // ... (Implement CreateDocument with parameterization and try-catch) ...
        }

        public void UpdateDocument(Document document)
        {
            // ... (Implement UpdateDocument with parameterization and try-catch) ...
        }

        public void DeleteDocument(int documentId)
        {
            // ... (Implement DeleteDocument with parameterization and try-catch) ...
        }
    }
}