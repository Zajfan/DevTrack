using MySql.Data.MySqlClient;

namespace DevTrack.DAL.Repositories
{
    public interface IDbConnectionFactory
    {
        MySqlConnection CreateConnection();
    }
}