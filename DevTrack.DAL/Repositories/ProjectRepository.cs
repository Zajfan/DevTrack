// ProjectRepository.cs
using DevTrack.DAL.Models;
using Task = DevTrack.DAL.Models.Task;

namespace DevTrack.DAL.Repositories
{
    public class ProjectRepository : BaseRepository
    {
        private readonly ProjectMapper projectMapper = new();

        public ProjectRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public MySqlConnection GetConnection()
        {
            return connectionFactory.CreateConnection();
        }
    }
}