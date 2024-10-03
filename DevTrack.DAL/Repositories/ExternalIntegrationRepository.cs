// ExternalIntegrationRepository.cs

namespace DevTrack.DAL.Repositories
{
    public class ExternalIntegrationRepository : BaseRepository
    {
        private readonly ExternalIntegrationMapper externalIntegrationMapper = new ExternalIntegrationMapper();

        public ExternalIntegrationRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<ExternalIntegration>> GetAllExternalIntegrationsAsync()
        {
            var integrations = new List<ExternalIntegration>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM external_integrations"; // Assuming you have an 'external_integrations' table
                    using var command = new MySqlCommand(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        integrations.Add(externalIntegrationMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all external integrations: {ex.Message}");
                return new List<ExternalIntegration>();
            }

            return integrations;
        }

        // ... (Implement other CRUD methods: CreateExternalIntegrationAsync, UpdateExternalIntegrationAsync, DeleteExternalIntegrationAsync) ...
    }
}