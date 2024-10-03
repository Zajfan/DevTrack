// DocumentRepository.cs
using System.Reflection.Metadata;

namespace DevTrack.DAL.Repositories
{
    public class DocumentRepository : BaseRepository
    {
        private readonly DocumentMapper documentMapper = new DocumentMapper();

        public DocumentRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<Document>> GetAllDocumentsAsync()
        {
            var documents = new List<Document>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM documents";
                    using var command = new MySqlCommand(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        documents.Add(documentMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all documents: {ex.Message}");
                return new List<Document>();
            }

            return documents;
        }

        public async Task CreateDocumentAsync(Document document)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "INSERT INTO documents (ProjectID, FileName, FilePath, UploadDate, UploadedBy, DocumentType) " +
                                   "VALUES (@ProjectID, @FileName, @FilePath, @UploadDate, @UploadedBy, @DocumentType)";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", document.ProjectID);
                    command.Parameters.AddWithValue("@FileName", document.FileName);
                    command.Parameters.AddWithValue("@FilePath", document.FilePath);
                    command.Parameters.AddWithValue("@UploadDate", document.UploadDate);
                    command.Parameters.AddWithValue("@UploadedBy", document.UploadedBy);
                    command.Parameters.AddWithValue("@DocumentType", document.DocumentType);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating document: {ex.Message}");
                throw;
            }
        }

        public async Task UpdateDocumentAsync(Document document)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "UPDATE documents SET ProjectID = @ProjectID, FileName = @FileName, FilePath = @FilePath, " +
                                   "UploadDate = @UploadDate, UploadedBy = @UploadedBy, DocumentType = @DocumentType " +
                                   "WHERE DocumentID = @DocumentID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", document.ProjectID);
                    command.Parameters.AddWithValue("@FileName", document.FileName);
                    command.Parameters.AddWithValue("@FilePath", document.FilePath);
                    command.Parameters.AddWithValue("@UploadDate", document.UploadDate);
                    command.Parameters.AddWithValue("@UploadedBy", document.UploadedBy);
                    command.Parameters.AddWithValue("@DocumentType", document.DocumentType);
                    command.Parameters.AddWithValue("@DocumentID", document.DocumentID);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating document: {ex.Message}");
                throw;
            }
        }

        public async Task DeleteDocumentAsync(int documentId)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "DELETE FROM documents WHERE DocumentID = @DocumentID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@DocumentID", documentId);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error deleting document: {ex.Message}");
                throw;
            }
        }
    }
}