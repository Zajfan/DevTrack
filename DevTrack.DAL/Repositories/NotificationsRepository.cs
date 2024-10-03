// NotificationsRepository.cs

namespace DevTrack.DAL.Repositories
{
    public class NotificationsRepository : BaseRepository
    {
        private readonly NotificationMapper notificationMapper = new NotificationMapper();

        public NotificationsRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<Notification>> GetAllNotificationsAsync()
        {
            var notifications = new List<Notification>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM notifications"; // Assuming you have a 'notifications' table
                    using var command = new MySqlCommand(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        notifications.Add(notificationMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all notifications: {ex.Message}");
                return new List<Notification>();
            }

            return notifications;
        }

        // ... (Implement other CRUD methods: CreateNotificationAsync, UpdateNotificationAsync, DeleteNotificationAsync) ...
    }
}
